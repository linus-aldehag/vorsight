using System.Management;
using System.Net.NetworkInformation;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text;

namespace Vorsight.Infrastructure.Identity;

public static class MachineIdentity
{
    [SupportedOSPlatform("windows")]
    public static string GenerateMachineId()
    {
        try
        {
            var components = new List<string>();

            var cpuId = GetCpuId();
            if (!string.IsNullOrEmpty(cpuId))
                components.Add(cpuId);

            var motherboardSerial = GetMotherboardSerial();
            if (!string.IsNullOrEmpty(motherboardSerial))
                components.Add(motherboardSerial);

            var macAddress = GetMacAddress();
            if (!string.IsNullOrEmpty(macAddress))
                components.Add(macAddress);

            var combined = string.Join("|", components);
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(combined));

            var guid = new Guid(hash.Take(16).ToArray());
            return guid.ToString();
        }
        catch (Exception)
        {
            // Fallback to machine name + random GUID
            return $"{Environment.MachineName}-{Guid.NewGuid()}";
        }
    }

    [SupportedOSPlatform("windows")]
    private static string? GetCpuId()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT ProcessorId FROM Win32_Processor"
            );
            var first = searcher.Get().Cast<ManagementBaseObject>().FirstOrDefault();

            return first?["ProcessorId"]?.ToString();
        }
        catch
        {
            return null;
        }
    }

    [SupportedOSPlatform("windows")]
    private static string? GetMotherboardSerial()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT SerialNumber FROM Win32_BaseBoard"
            );
            var first = searcher.Get().Cast<ManagementBaseObject>().FirstOrDefault();

            return first?["serialNumber"]?.ToString();
        }
        catch
        {
            return null;
        }
    }

    private static string? GetMacAddress()
    {
        try
        {
            var nics = NetworkInterface.GetAllNetworkInterfaces();
            var firstPhysical = nics.FirstOrDefault(n =>
                n.NetworkInterfaceType != NetworkInterfaceType.Loopback
                && n.OperationalStatus == OperationalStatus.Up
            );

            return firstPhysical?.GetPhysicalAddress().ToString();
        }
        catch
        {
            return null;
        }
    }
}
