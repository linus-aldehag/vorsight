using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using DriveFile = Google.Apis.Drive.v3.Data.File;
using File = System.IO.File;

using Vorsight.Service.Utilities;

namespace Vorsight.Service.Storage;

public interface IGoogleDriveService
{
    Task<string?> EnsureFolderExistsAsync(string folderName);
    Task<string?> UploadFileAsync(string filePath, string fileName, string mimeType, string parentFolderId);
    Task<Stream?> DownloadLatestScreenshotAsync();
    Task UploadFileAsync(string filePath, CancellationToken cancellationToken);
    Task InitializeAsync();
    Task WaitForPendingUploadsAsync(TimeSpan? timeout = null);
    Task<List<DriveFile>> ListScreenshotsAsync(int limit);
    Task<Stream?> DownloadFileAsync(string fileId);
}

public class GoogleDriveService : IGoogleDriveService, IAsyncDisposable
{
    private readonly string _clientSecretsPath;
    private readonly ILogger<GoogleDriveService> _logger;
    private readonly SemaphoreSlim _uploadSemaphore = new(1, 1);
    private readonly List<Task> _activeUploads = [];
    private readonly Lock _uploadsLock = new();
    // Track if we're shutting down
    private bool _isShuttingDown;
    
    // Cache drive service to avoid re-authenticating every time
    private DriveService? _driveServiceInstance;
    
    public GoogleDriveService(
        IConfiguration config, 
        ILogger<GoogleDriveService> logger)
    {
        var clientSecretsPath = config["GoogleDrive:ClientSecretsPath"] ?? "oauth.json";
        // Use AppContext.BaseDirectory to resolve paths relative to the application directory
        _clientSecretsPath = Path.Combine(AppContext.BaseDirectory, clientSecretsPath);
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        // Pre-initialize service to fail fast if auth is missing
        try 
        {
            if (File.Exists(_clientSecretsPath))
            {
                _driveServiceInstance = await GetDriveServiceAsync(CancellationToken.None);
                _logger.LogInformation("Google Drive Service initialized successfully");
            }
            else
            {
                _logger.LogWarning("Google Drive client secrets not found at {Path}. Uploads will fail.", _clientSecretsPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Google Drive Service");
        }
    }

    public async ValueTask DisposeAsync()
    {
        _isShuttingDown = true;
        
        // Wait for all active uploads to complete or timeout
        await WaitForPendingUploadsAsync(TimeSpan.FromSeconds(10));
        
        _uploadSemaphore.Dispose();
    }

    public async Task WaitForPendingUploadsAsync(TimeSpan? timeout = null)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(30);
        
        // Release semaphore if we're blocked
        if (_uploadSemaphore.CurrentCount == 0)
        {
            _logger.LogInformation("Waiting for ongoing uploads to complete...");
            var semaphoreAcquired = await _uploadSemaphore.WaitAsync(actualTimeout);
            if (!semaphoreAcquired)
            {
                _logger.LogWarning("Timed out waiting for upload semaphore");
                return;
            }
        }

        List<Task> uploadsToWait;
        lock (_uploadsLock)
        {
            // Filter out already completed, canceled, or faulted tasks
            uploadsToWait = _activeUploads
                .Where(t => !t.IsCompleted && !t.IsCanceled && !t.IsFaulted)
                .ToList();
        }

        if (uploadsToWait.Any())
        {
            _logger.LogInformation("Waiting for {Count} pending uploads (out of {Total} active tasks)...", 
                uploadsToWait.Count, _activeUploads.Count);
                
            try
            {
                // Create a timeout task
                using var cts = new CancellationTokenSource(actualTimeout);
                var uploadTasks = Task.WhenAll(uploadsToWait);
                
                // Wait for either all uploads or timeout
                await uploadTasks.WaitAsync(cts.Token);
                _logger.LogInformation("All pending uploads completed successfully");
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Timeout waiting for uploads to complete after {Seconds}s", actualTimeout.TotalSeconds);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error waiting for uploads to complete");
            }
        }
        else
        {
            _logger.LogDebug("No pending uploads to wait for");
        }
    }
    
    private async Task<DriveService> GetDriveServiceAsync(CancellationToken cancellationToken)
    {
        if (_driveServiceInstance != null) return _driveServiceInstance;

        if (!File.Exists(_clientSecretsPath))
        {
            throw new InvalidOperationException($"Client secrets file not found at: {_clientSecretsPath}");
        }

        // Load client secrets and request user consent if needed
        await using var stream = new FileStream(_clientSecretsPath, FileMode.Open, FileAccess.Read);
        
        // Create a data store in the application directory instead of working directory
        var credentialPath = Path.Combine(AppContext.BaseDirectory, "DriveCredentials");
        _logger.LogDebug("Using credential store path: {Path}", credentialPath);
        var dataStore = new FileDataStore(credentialPath, true);
        
        try
        {
            var credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                (await GoogleClientSecrets.FromStreamAsync(stream, cancellationToken)).Secrets,
                [DriveService.Scope.DriveFile],
                "user",
                cancellationToken,
                dataStore
            );

            return new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Vorsight"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to authenticate with Google Drive. Please verify 'oauth.json' or 'client_secrets.json' is valid and contains correct client secrets.");
            throw new InvalidOperationException("Google Drive authentication failed", ex);
        }
    }

    private async Task<string> GetOrCreateFolderAsync(DriveService service, string path,
        CancellationToken cancellationToken)
    {
        var pathParts = path.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();

        string? parentId = null;
        string currentPath = "";

        foreach (var part in pathParts)
        {
            currentPath = Path.Combine(currentPath, part);
            var folderId = await FindOrCreateFolderAsync(service, part, parentId, cancellationToken);
            parentId = folderId;
        }

        return parentId ?? throw new InvalidOperationException("Failed to create folder structure");
    }

    private async Task<string> FindOrCreateFolderAsync(DriveService service, string name, string? parentId, CancellationToken cancellationToken)
    {
        try
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
            
            // Handle cancellation gracefully
            try
            {
                var files = await listRequest.ExecuteAsync(cancellationToken);
                if (files.Files?.Any() == true)
                {
                    var folderId = files.Files[0].Id;
                    _logger.LogDebug("Found existing folder '{Name}': {FolderId}", name, folderId);
                    return folderId;
                }
            }
            catch (OperationCanceledException) when (_isShuttingDown)
            {
                _logger.LogInformation("Folder search cancelled during shutdown for '{Name}'", name);
                throw; // Rethrow to handle in calling method
            }

            // Create new folder
            _logger.LogInformation("Creating new folder: {FolderName}", name);
            var folderMetadata = new DriveFile
            {
                Name = name,
                MimeType = "application/vnd.google-apps.folder"
            };

            if (parentId != null)
            {
                folderMetadata.Parents = [parentId];
            }

            // Handle cancellation gracefully
            try
            {
                var folder = await service.Files.Create(folderMetadata).ExecuteAsync(cancellationToken);
                _logger.LogInformation("Created folder '{Name}': {FolderId}", name, folder.Id);
                return folder.Id;
            }
            catch (OperationCanceledException) when (_isShuttingDown)
            {
                _logger.LogInformation("Folder creation cancelled during shutdown for '{Name}'", name);
                throw; // Rethrow to handle in calling method
            }
        }
        catch (Exception ex) when (!ex.IsCancellation() || !_isShuttingDown)
        {
            _logger.LogError(ex, "Failed to find or create folder '{Name}'", name);
            throw;
        }
    }

    public async Task UploadFileAsync(string filePath, CancellationToken cancellationToken)
    {
        // Legacy implementation for UploadQueueProcessor
        
        // Create a new cancellation token source that isn't affected by application shutdown
        // if we're already shutting down
        using var uploadCts = _isShuttingDown ? 
            new CancellationTokenSource() : 
            CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            
        Task uploadTask = null!;
        try
        {
            // If we're shutting down, don't wait indefinitely for the semaphore
            if (_isShuttingDown)
            {
                if (!await _uploadSemaphore.WaitAsync(TimeSpan.FromSeconds(2), uploadCts.Token))
                {
                    _logger.LogInformation("Skipping upload during shutdown: {FilePath}", filePath);
                    return;
                }
            }
            else
            {
                await _uploadSemaphore.WaitAsync(uploadCts.Token);
            }
            
            uploadTask = InternalUploadFileAsync(filePath, uploadCts.Token);
            lock (_uploadsLock)
            {
                _activeUploads.Add(uploadTask);
            }
            
            await uploadTask;
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Upload cancelled for file: {FilePath}", filePath);
            // Don't rethrow when shutting down
            if (!_isShuttingDown) throw;
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("authentication failed"))
        {
            _logger.LogError("Drive Upload Failed: Authentication credentials are invalid or missing. Ensure oauth.json is correct.");
            if (!_isShuttingDown) throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to Google Drive: {FilePath}", filePath);
            // Don't rethrow when shutting down
            if (!_isShuttingDown) throw;
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

    private async Task InternalUploadFileAsync(string filePath, CancellationToken cancellationToken)
    {
        var service = await GetDriveServiceAsync(cancellationToken);
            
        // Use /Vorsight/MachineName/YYYY-MM-DD structure
        var machineName = Environment.MachineName;
        var dateFolder = DateTime.Now.ToString("yyyy-MM-dd");
        var folderPath = $"Vorsight/{machineName}/{dateFolder}";
            
        // Create all necessary folders
        var folderId = await GetOrCreateFolderAsync(service, folderPath, cancellationToken);
            
        _logger.LogInformation("Starting upload of file: {FilePath} to folder: {FolderPath} ({FolderId})", filePath, folderPath, folderId);
            
        var fileMetadata = new DriveFile
        {
            Name = Path.GetFileName(filePath),
            Description = $"Screenshot from {Environment.MachineName} at {DateTime.Now:yyyy-MM-dd HH:mm:ss}",
            Parents = [folderId]
        };

        await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var request = service.Files.Create(fileMetadata, stream, "image/png");
        request.Fields = "id, webViewLink";
            
        var response = await request.UploadAsync(cancellationToken);
            
        if (response.Status == Google.Apis.Upload.UploadStatus.Completed)
        {
            var file = request.ResponseBody;
            _logger.LogInformation("File uploaded successfully. ID: {FileId}, Link: {Link}", 
                file.Id, file.WebViewLink);
        }
        else if (response.Exception != null)
        {
            _logger.LogError(response.Exception, "Upload failed with exception. Status: {Status}", response.Status);
            throw new InvalidOperationException($"Upload failed: {response.Exception.Message}", response.Exception);
        }
        else
        {
            _logger.LogError("Upload failed with status: {Status}", response.Status);
            throw new InvalidOperationException($"Upload failed with status: {response.Status}");
        }
    }

    public async Task<string?> EnsureFolderExistsAsync(string folderName)
    {
        // Use cached service or get new one
        var service = await GetDriveServiceAsync(CancellationToken.None);

        try
        {
            // Check if exists
            var request = service.Files.List();
            request.Q = $"mimeType = 'application/vnd.google-apps.folder' and name = '{folderName}' and trashed = false";
            request.Fields = "files(id, name)";
            
            var result = await request.ExecuteAsync();
            var folder = result.Files.FirstOrDefault();

            if (folder != null)
                return folder.Id;

            // Create if not exists
            var fileMetadata = new Google.Apis.Drive.v3.Data.File()
            {
                Name = folderName,
                MimeType = "application/vnd.google-apps.folder"
            };

            var createRequest = service.Files.Create(fileMetadata);
            createRequest.Fields = "id";
            var file = await createRequest.ExecuteAsync();
            
            _logger.LogInformation("Created Google Drive folder: {FolderName}", folderName);
            return file.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to ensure folder exists: {FolderName}", folderName);
            return null;
        }
    }

    public async Task<string?> UploadFileAsync(string filePath, string fileName, string mimeType, string parentFolderId)
    {
        var service = await GetDriveServiceAsync(CancellationToken.None);

        try
        {
            var fileMetadata = new Google.Apis.Drive.v3.Data.File()
            {
                Name = fileName,
                Parents = parentFolderId != null ? new List<string> { parentFolderId } : null
            };

            using var stream = new FileStream(filePath, FileMode.Open);
            var request = service.Files.Create(fileMetadata, stream, mimeType);
            request.Fields = "id";
            
            var result = await request.UploadAsync();
            
            if (result.Status == Google.Apis.Upload.UploadStatus.Failed)
                throw result.Exception;

            return request.ResponseBody?.Id ?? throw new Exception("Upload succeeded but no ID returned");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to direct upload file: {FileName}", fileName);
            throw;
        }
    }

    public async Task<Stream?> DownloadLatestScreenshotAsync()
    {
        var service = await GetDriveServiceAsync(CancellationToken.None);
        try
        {
            // Find latest screenshot (Strict)
            var listRequest = service.Files.List();
            listRequest.Q = "mimeType = 'image/png' and name contains 'screenshot' and trashed = false";
            listRequest.OrderBy = "createdTime desc";
            listRequest.PageSize = 1;
            listRequest.Fields = "files(id, name)";
            
            var files = await listRequest.ExecuteAsync();
            var latestFile = files.Files?.FirstOrDefault();

            if (files.Files != null && files.Files.Count > 0)
            {
               _logger.LogInformation("Found {Count} screenshots. Latest: {Name} ({Id})", files.Files.Count, latestFile?.Name, latestFile?.Id);
            }
            else
            {
               _logger.LogWarning("No screenshots found in Drive matching query.");
            }
            
            if (latestFile == null) return null;

            var stream = new MemoryStream();
            var getRequest = service.Files.Get(latestFile.Id);
            await getRequest.DownloadAsync(stream);
            stream.Position = 0;
            return stream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download latest screenshot");
            return null;
        }
    }

    public async Task<List<DriveFile>> ListScreenshotsAsync(int limit)
    {
        var service = await GetDriveServiceAsync(CancellationToken.None);
        try
        {
            // Find the Vorsight root folder first
            var folderRequest = service.Files.List();
            folderRequest.Q = "mimeType = 'application/vnd.google-apps.folder' and name = 'Vorsight' and trashed = false";
            folderRequest.Fields = "files(id)";
            var folders = await folderRequest.ExecuteAsync();
            
            string query;
            if (folders.Files?.Any() == true)
            {
                // Search for PNG files within Vorsight folder and all subfolders
                var vorsightFolderId = folders.Files[0].Id;
                query = $"mimeType = 'image/png' and '{vorsightFolderId}' in parents and trashed = false";
                
                _logger.LogDebug("Searching for screenshots in Vorsight folder: {FolderId}", vorsightFolderId);
            }
            else
            {
                // Fallback: if Vorsight folder not found, return empty
                _logger.LogWarning("Vorsight folder not found in Google Drive");
                return new List<DriveFile>();
            }
            
            var listRequest = service.Files.List();
            listRequest.Q = query;
            listRequest.OrderBy = "createdTime desc";
            listRequest.PageSize = limit;
            listRequest.Fields = "files(id, name, createdTime, webViewLink, webContentLink, thumbnailLink)";
            
            var result = await listRequest.ExecuteAsync();
            
            // If no direct children found, search recursively in all subfolders
            if (result.Files == null || !result.Files.Any())
            {
                var vorsightFolderId = folders.Files[0].Id;
                // Get all folders under Vorsight recursively
                var allFolders = await GetAllSubfoldersAsync(service, vorsightFolderId);
                
                if (allFolders.Any())
                {
                    // Build query to search in all subfolders
                    var folderQueries = allFolders.Select(f => $"'{f}' in parents").ToList();
                    query = $"mimeType = 'image/png' and ({string.Join(" or ", folderQueries)}) and trashed = false";
                    
                    listRequest = service.Files.List();
                    listRequest.Q = query;
                    listRequest.OrderBy = "createdTime desc";
                    listRequest.PageSize = limit;
                    listRequest.Fields = "files(id, name, createdTime, webViewLink, webContentLink, thumbnailLink)";
                    
                    result = await listRequest.ExecuteAsync();
                }
            }
            
            return result.Files?.ToList() ?? new List<DriveFile>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list screenshots");
            return new List<DriveFile>();
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
                    // Recursively get subfolders
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

    public async Task<Stream?> DownloadFileAsync(string fileId)
    {
        var service = await GetDriveServiceAsync(CancellationToken.None);
        try
        {
            var request = service.Files.Get(fileId);
            var stream = new MemoryStream();
            await request.DownloadAsync(stream);
            stream.Position = 0;
            return stream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file {FileId}", fileId);
            return null;
        }
    }
}
