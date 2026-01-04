using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using System.Net.Http.Json;
using Vorsight.Service.Server;
using DriveFile = Google.Apis.Drive.v3.Data.File;
using File = System.IO.File;

namespace Vorsight.Service.Storage;

public interface IGoogleDriveService
{
    Task<string> UploadFileAsync(string filePath, CancellationToken cancellationToken);
    Task InitializeAsync();
    void BeginShutdown();
    Task WaitForPendingUploadsAsync(TimeSpan? timeout = null);
    
    // Methods for web UI screenshot viewing
    Task<Stream?> DownloadLatestScreenshotAsync();
    Task<List<Google.Apis.Drive.v3.Data.File>> ListScreenshotsAsync(int limit);
    Task<Stream?> DownloadFileAsync(string fileId);
}

public class GoogleDriveService : IGoogleDriveService
{
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleDriveService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IServerConnection _serverConnection;
    private readonly SemaphoreSlim _uploadSemaphore = new(1, 1);
    private readonly List<Task> _activeUploads = [];
    private readonly Lock _uploadsLock = new();
    private bool _isShuttingDown;

    // Cached credentials
    private string? _cachedAccessToken;
    private DateTime _tokenExpiresAt = DateTime.MinValue;

    public GoogleDriveService(
        IConfiguration config,
        ILogger<GoogleDriveService> logger,
        IHttpClientFactory httpClientFactory,
        IServerConnection serverConnection)
    {
        _config = config;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _serverConnection = serverConnection;
    }

    public Task InitializeAsync()
    {
        _logger.LogInformation("Google Drive Service initialized (credential-based direct uploads)");
        return Task.CompletedTask;
    }

    public void BeginShutdown()
    {
        _logger.LogInformation("Google Drive Service beginning shutdown sequence");
        _isShuttingDown = true;
    }

    public async Task WaitForPendingUploadsAsync(TimeSpan? timeout = null)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(30);

        List<Task> uploadsToWait;
        lock (_uploadsLock)
        {
            uploadsToWait = _activeUploads
                .Where(t => !t.IsCompleted && !t.IsCanceled && !t.IsFaulted)
                .ToList();
        }

        if (uploadsToWait.Any())
        {
            _logger.LogInformation("Waiting for {Count} pending uploads...", uploadsToWait.Count);

            try
            {
                using var cts = new CancellationTokenSource(actualTimeout);
                await Task.WhenAll(uploadsToWait).WaitAsync(cts.Token);
                _logger.LogInformation("All pending uploads completed successfully");
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Timeout waiting for uploads after {Seconds}s", actualTimeout.TotalSeconds);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error waiting for uploads to complete");
            }
        }
    }

    public async Task<string> UploadFileAsync(string filePath, CancellationToken cancellationToken)
    {
        if (_isShuttingDown)
        {
            _logger.LogInformation("Skipping upload during shutdown: {FilePath}", filePath);
            return string.Empty;
        }

        using var uploadCts = _isShuttingDown
            ? new CancellationTokenSource()
            : CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        Task uploadTask = null!;
        try
        {
            if (_isShuttingDown)
            {
                if (!await _uploadSemaphore.WaitAsync(TimeSpan.FromSeconds(2), uploadCts.Token))
                {
                    _logger.LogInformation("Skipping upload during shutdown: {FilePath}", filePath);
                    return string.Empty;
                }
            }
            else
            {
                await _uploadSemaphore.WaitAsync(uploadCts.Token);
            }

            var uploadFileTask = InternalUploadFileAsync(filePath, uploadCts.Token);
            uploadTask = uploadFileTask;
            lock (_uploadsLock)
            {
                _activeUploads.Add(uploadTask);
            }

            return await uploadFileTask;
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Upload cancelled for file: {FilePath}", filePath);
            if (!_isShuttingDown) throw;
            return string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to Google Drive: {FilePath}", filePath);
            if (!_isShuttingDown) throw;
            return string.Empty;
        }
        finally
        {
            lock (_uploadsLock)
            {
                _activeUploads.Remove(uploadTask);
            }

            if (_uploadSemaphore.CurrentCount == 0)
            {
                _uploadSemaphore.Release();
            }
        }
    }

    private async Task<string> InternalUploadFileAsync(string filePath, CancellationToken cancellationToken)
    {
        return await ExecuteWithRetryAsync(async (accessToken) =>
        {
            // Create Drive service with server-provided credentials
            var credential = GoogleCredential.FromAccessToken(accessToken);
            var driveService = new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Vorsight"
            });

            // Use /Vorsight/MachineName/YYYY-MM-DD structure
            var machineName = Environment.MachineName;
            var dateFolder = DateTime.Now.ToString("yyyy-MM-dd");
            var folderPath = $"Vorsight/{machineName}/{dateFolder}";

            // Create all necessary folders
            var folderId = await GetOrCreateFolderAsync(driveService, folderPath, cancellationToken);

            _logger.LogInformation("Starting upload of file: {FilePath} to folder: {FolderPath} ({FolderId})", filePath, folderPath, folderId);

            var fileMetadata = new DriveFile
            {
                Name = Path.GetFileName(filePath),
                Description = $"Screenshot from {Environment.MachineName} at {DateTime.Now:yyyy-MM-dd HH:mm:ss}",
                Parents = [folderId]
            };

            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var request = driveService.Files.Create(fileMetadata, stream, "image/png");
            request.Fields = "id, webViewLink";

            var response = await request.UploadAsync(cancellationToken);

            if (response.Status == Google.Apis.Upload.UploadStatus.Completed)
            {
                var file = request.ResponseBody;
                _logger.LogInformation("File uploaded successfully. ID: {FileId}, Link: {Link}",
                    file.Id, file.WebViewLink);
                return file.Id;
            }
            else if (response.Exception != null)
            {
                // Rethrow specific exceptions to trigger retry if applicable
                // UploadAsync swallows exceptions into response.Exception
                throw response.Exception;
            }
            else
            {
                _logger.LogError("Upload failed with status: {Status}", response.Status);
                throw new InvalidOperationException($"Upload failed with status: {response.Status}");
            }
        }, cancellationToken);
    }

    private async Task<T> ExecuteWithRetryAsync<T>(Func<string, Task<T>> action, CancellationToken cancellationToken)
    {
        bool retried = false;
        while (true)
        {
            string accessToken;
            try
            {
                accessToken = await GetAccessTokenAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get access token");
                throw;
            }

            try
            {
                return await action(accessToken);
            }
            catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.Unauthorized && !retried)
            {
                _logger.LogWarning("Got 401 Unauthorized from Google API. Invalidating cached access token and retrying...");
                InvalidateToken();
                retried = true;
                // Loop will continue and call GetAccessTokenAsync again, which will fetch a fresh token
            }
            catch (Exception ex) when (!retried && IsAuthFailure(ex))
            {
                _logger.LogWarning(ex, "Got potential auth failure ({Message}). Invalidating cached access token and retrying...", ex.Message);
                InvalidateToken();
                retried = true;
            }
            catch (Exception)
            {
                // If it's not an auth error or we already retried, let it bubble up
                throw;
            }
        }
    }

    private bool IsAuthFailure(Exception ex)
    {
        // Check for other common shapes of auth errors if the SDK doesn't always throw GoogleApiException
        // Sometimes wrapped in AggregateException or other wrappers
        var baseEx = ex.GetBaseException(); 
        if (baseEx is Google.GoogleApiException gaEx && gaEx.HttpStatusCode == System.Net.HttpStatusCode.Unauthorized)
            return true;
            
        return false;
    }

    private void InvalidateToken()
    {
        _cachedAccessToken = null;
        _tokenExpiresAt = DateTime.MinValue;
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        // Return cached token if still valid
        if (_cachedAccessToken != null && DateTime.UtcNow < _tokenExpiresAt.AddMinutes(-5))
        {
            return _cachedAccessToken;
        }

        // Request fresh credentials from server
        var serverUrl = _config["Server:Url"];
        var apiKey = _serverConnection.ApiKey;

        if (string.IsNullOrEmpty(serverUrl))
        {
            throw new InvalidOperationException("Server URL not configured in appsettings.json");
        }

        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("Machine not registered with server - missing API key");
        }

        using var httpClient = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, $"{serverUrl.TrimEnd('/')}/api/oauth/google/credentials");
        request.Headers.Add("x-api-key", apiKey);

        var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var credentialsResponse = await response.Content.ReadFromJsonAsync<CredentialsResponse>(cancellationToken);
        if (credentialsResponse == null)
        {
            throw new InvalidOperationException("Failed to parse credentials response from server");
        }

        _cachedAccessToken = credentialsResponse.AccessToken;
        _tokenExpiresAt = DateTime.Parse(credentialsResponse.ExpiresAt);

        _logger.LogInformation("Received fresh access token from server, expires at {ExpiresAt}", _tokenExpiresAt);
        return _cachedAccessToken;
    }

    private async Task<string> GetOrCreateFolderAsync(DriveService service, string path, CancellationToken cancellationToken)
    {
        var pathParts = path.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();

        string? parentId = null;

        foreach (var part in pathParts)
        {
            var folderId = await FindOrCreateFolderAsync(service, part, parentId, cancellationToken);
            parentId = folderId;
        }

        return parentId ?? throw new InvalidOperationException("Failed to create folder structure");
    }

    private async Task<string> FindOrCreateFolderAsync(DriveService service, string name, string? parentId, CancellationToken cancellationToken)
    {
        // Search for existing folder
        var query = $"mimeType='application/vnd.google-apps.folder' and name='{name}' and trashed=false";
        if (parentId != null)
        {
            query += $" and '{parentId}' in parents";
        }

        var listRequest = service.Files.List();
        listRequest.Q = query;
        listRequest.Fields = "files(id, name)";
        listRequest.Spaces = "drive";

        var files = await listRequest.ExecuteAsync(cancellationToken);
        if (files.Files?.Any() == true)
        {
            return files.Files[0].Id;
        }

        // Create new folder
        var folderMetadata = new DriveFile
        {
            Name = name,
            MimeType = "application/vnd.google-apps.folder",
            Parents = parentId != null ? [parentId] : null
        };

        var folder = await service.Files.Create(folderMetadata).ExecuteAsync(cancellationToken);
        _logger.LogInformation("Created folder '{Name}': {FolderId}", name, folder.Id);
        return folder.Id;
    }

    // Methods for web UI screenshot viewing
    public async Task<Stream?> DownloadLatestScreenshotAsync()
    {
        try
        {
            return await ExecuteWithRetryAsync(async (accessToken) =>
            {
                var credential = GoogleCredential.FromAccessToken(accessToken);
                var driveService = new DriveService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "Vorsight"
                });

                var listRequest = driveService.Files.List();
                listRequest.Q = "mimeType = 'image/png' and name contains 'screenshot' and trashed = false";
                listRequest.OrderBy = "createdTime desc";
                listRequest.PageSize = 1;
                listRequest.Fields = "files(id, name)";

                var files = await listRequest.ExecuteAsync();
                var latestFile = files.Files?.FirstOrDefault();

                if (latestFile == null) return null;

                var stream = new MemoryStream();
                var getRequest = driveService.Files.Get(latestFile.Id);
                await getRequest.DownloadAsync(stream);
                stream.Position = 0;
                return stream;
            }, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download latest screenshot");
            return null;
        }
    }

    public async Task<List<DriveFile>> ListScreenshotsAsync(int limit)
    {
        try
        {
            return await ExecuteWithRetryAsync(async (accessToken) =>
            {
                var credential = GoogleCredential.FromAccessToken(accessToken);
                var driveService = new DriveService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "Vorsight"
                });

                // Find the Vorsight root folder first
                var folderRequest = driveService.Files.List();
                folderRequest.Q = "mimeType = 'application/vnd.google-apps.folder' and name = 'Vorsight' and trashed = false";
                folderRequest.Fields = "files(id)";
                var folders = await folderRequest.ExecuteAsync();

                if (folders.Files?.Any() != true)
                {
                    _logger.LogWarning("Vorsight folder not found in Google Drive");
                    return new List<DriveFile>();
                }

                var vorsightFolderId = folders.Files[0].Id;
                var allFolders = await GetAllSubfoldersAsync(driveService, vorsightFolderId);
                allFolders.Insert(0, vorsightFolderId);

                var folderQueries = allFolders.Select(f => $"'{f}' in parents");
                var query = $"mimeType = 'image/png' and ({string.Join(" or ", folderQueries)}) and trashed = false";

                var listRequest = driveService.Files.List();
                listRequest.Q = query;
                listRequest.OrderBy = "createdTime desc";
                listRequest.PageSize = limit;
                listRequest.Fields = "files(id, name, createdTime, webViewLink, webContentLink, thumbnailLink)";

                var result = await listRequest.ExecuteAsync();
                return result.Files?.ToList() ?? new List<DriveFile>();
            }, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list screenshots");
            return new List<DriveFile>();
        }
    }

    public async Task<Stream?> DownloadFileAsync(string fileId)
    {
        try
        {
            return await ExecuteWithRetryAsync(async (accessToken) =>
            {
                var credential = GoogleCredential.FromAccessToken(accessToken);
                var driveService = new DriveService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "Vorsight"
                });

                var request = driveService.Files.Get(fileId);
                var stream = new MemoryStream();
                await request.DownloadAsync(stream);
                stream.Position = 0;
                return stream;
            }, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file {FileId}", fileId);
            return null;
        }
    }

    private async Task<List<string>> GetAllSubfoldersAsync(DriveService service, string parentFolderId)
    {
        var folderIds = new List<string>();

        try
        {
            var request = service.Files.List();
            request.Q = $"mimeType = 'application/vnd.google-apps.folder' and '{parentFolderId}' in parents and trashed = false";
            request.Fields = "files(id)";
            request.PageSize = 100;

            var result = await request.ExecuteAsync();

            if (result.Files != null)
            {
                foreach (var folder in result.Files)
                {
                    folderIds.Add(folder.Id);
                    var subfolders = await GetAllSubfoldersAsync(service, folder.Id);
                    folderIds.AddRange(subfolders);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get subfolders for {ParentId}", parentFolderId);
        }

        return folderIds;
    }

    private class CredentialsResponse
    {
        public string AccessToken { get; set; } = "";
        public string ExpiresAt { get; set; } = "";
        public string Scope { get; set; } = "";
    }
}
