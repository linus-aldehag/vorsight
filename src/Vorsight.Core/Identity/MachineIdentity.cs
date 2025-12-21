using System.Management;
using System.Security.Cryptography;
using System.Text;

namespace Vorsight.Core.Identity;

public static class MachineIdentity
{
    /// <summary>
    /// Generates a stable, hardware-based machine ID
    /// </summary>
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public static string GenerateMachineId()
    {
        try
        {
            var components = new List<string>();
            
            // Get CPU ID
            var cpuId = GetCpuId();
            if (!string.IsNullOrEmpty(cpuId))
                components.Add(cpuId);
            
            // Get motherboard serial
            var motherboardSerial = GetMotherboardSerial();
            if (!string.IsNullOrEmpty(motherboardSerial))
                components.Add(motherboardSerial);
            
            // Get MAC address
            var macAddress = GetMacAddress();
            if (!string.IsNullOrEmpty(macAddress))
                components.Add(macAddress);
            
            // Combine and hash
            var combined = string.Join("|", components);
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(combined));
            
            // Convert to UUID format
            var guid = new Guid(hash.Take(16).ToArray());
            return guid.ToString();
        }
        catch (Exception)
        {
            // Fallback to machine name + random GUID
            return $"{Environment.MachineName}-{Guid.NewGuid()}";
        }
    }
    
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private static string? GetCpuId()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor");
            foreach (var obj in searcher.Get())
            {
                return obj["ProcessorId"]?.ToString();
            }
        }
        catch { }
        return null;
    }
    
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private static string? GetMotherboardSerial()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard");
            foreach (var obj in searcher.Get())
            {
                return obj["SerialNumber"]?.ToString();
            }
        }
        catch { }
        return null;
    }
    
    private static string? GetMacAddress()
    {
        try
        {
            var nics = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces();
            var firstPhysical = nics.FirstOrDefault(n => 
                n.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Loopback &&
                n.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up);
            
            return firstPhysical?.GetPhysicalAddress().ToString();
        }
        catch { }
        return null;
    }
}
