using System;
using System.Runtime.InteropServices;

namespace Vorsight.Native
{
    /// <summary>
    /// P/Invoke declarations for Windows Terminal Server and session management.
    /// Used to detect and identify the active user session.
    /// </summary>
    public static class SessionInterop
    {
        /// <summary>
        /// Gets the session ID of the active console session.
        /// In most cases, this will be Session 1 (the interactive user session).
        /// </summary>
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern uint WTSGetActiveConsoleSessionId();

        /// <summary>
        /// Queries information about a Terminal Services session.
        /// </summary>
        [DllImport("wtsapi32.dll", SetLastError = true)]
        public static extern bool WTSQuerySessionInformation(
            IntPtr hServer,
            uint SessionId,
            WTS_INFO_CLASS WTSInfoClass,
            out IntPtr ppBuffer,
            out uint pBytesReturned);

        /// <summary>
        /// Enumerates all sessions on a Terminal Server.
        /// </summary>
        [DllImport("wtsapi32.dll", SetLastError = true)]
        public static extern bool WTSEnumerateSessions(
            IntPtr hServer,
            uint Reserved,
            uint Version,
            out IntPtr ppSessionInfo,
            out uint pCount);

        /// <summary>
        /// Frees memory allocated by Terminal Services functions.
        /// </summary>
        [DllImport("wtsapi32.dll", SetLastError = true)]
        public static extern void WTSFreeMemory(IntPtr pMemory);

        /// <summary>
        /// Opens a handle to a Terminal Server.
        /// IntPtr.Zero refers to the local server.
        /// </summary>
        [DllImport("wtsapi32.dll", SetLastError = true)]
        public static extern IntPtr WTSOpenServer(string pServerName);

        /// <summary>
        /// Closes a Terminal Server handle.
        /// </summary>
        [DllImport("wtsapi32.dll", SetLastError = true)]
        public static extern void WTSCloseServer(IntPtr hServer);

        /// <summary>
        /// Information classes for WTSQuerySessionInformation.
        /// </summary>
        public enum WTS_INFO_CLASS
        {
            WTSInitialProgram = 0,
            WTSApplicationName = 1,
            WTSWorkingDirectory = 2,
            WTSOEMId = 3,
            WTSSessionId = 4,
            WTSUserName = 5,
            WTSWinStationName = 6,
            WTSDomainName = 7,
            WTSConnectState = 8,
            WTSClientBuildNumber = 9,
            WTSClientName = 10,
            WTSClientDirectory = 11,
            WTSDefaultTimeZone = 12,
            WTSEffectiveTimeZone = 13,
            WTSCallBackNumber = 14,
            WTSCallBackNumber2 = 15,
            WTSClientAddress = 16,
            WTSClientAddressV6 = 17,
            WTSClientProductId = 18,
            WTSClientHardwareId = 19,
            WTSClientProtocolType = 20,
            WTSIsClientLoggedOn = 21,
            WTSClientEncryptionLevel = 22,
            WTSClientVersionNumber = 23,
            WTSSessionCreateTime = 24,
            WTSSessionReconnectTime = 25,
            WTSSessionDisconnectTime = 26,
            WTSExecSrvSystemPipeAvailability = 27,
            WTSSessionRxByteCount = 28,
            WTSSessionTxByteCount = 29,
            WTSLicenseIndicators = 30,
            WTSSessionAddressV4 = 31,
            WTSSessionAddressV6 = 32,
            WTSSessionAuditEventType = 33,
            WTSSessionTerminalProtocolStatus = 34,
            WTSSessionTimeZoneAdjustment = 35,
            WTSSessionRemoteGuaranteedBandwidth = 36,
            WTSSessionRemoteCurrentBandwidth = 37,
            WTSSessionDisplayDrivers = 38,
            WTSSessionInputAssemblyVersion = 39,
            WTSSessionActivityTimestamp = 40,
            WTSSessionLogonTime = 41,
            WTSSessionLogoffTime = 42,
            WTSSessionWallpaperDisplayed = 43,
            WTSSessionUsageCompressionFlags = 44,
            WTSSessionRemoteSessionActiveNotification = 45
        }

        /// <summary>
        /// Connection states for sessions.
        /// </summary>
        public enum WTS_CONNECTSTATE_CLASS
        {
            WTSActive = 0,
            WTSConnected = 1,
            WTSConnectQuery = 2,
            WTSShadow = 3,
            WTSDisconnected = 4,
            WTSIdle = 5,
            WTSListen = 6,
            WTSReset = 7,
            WTSDown = 8,
            WTSInit = 9
        }

        /// <summary>
        /// Session information structure returned by WTSEnumerateSessions.
        /// </summary>
        [StructLayout(LayoutKind.Sequential)]
        public struct WTS_SESSION_INFO
        {
            public uint SessionId;
            public string pWinStationName;
            public WTS_CONNECTSTATE_CLASS State;
        }

        /// <summary>
        /// Special server handle value for local server operations.
        /// </summary>
        public static readonly IntPtr WTS_CURRENT_SERVER_HANDLE = IntPtr.Zero;

        public const uint WTS_CURRENT_SESSION = uint.MaxValue;
    }
}

