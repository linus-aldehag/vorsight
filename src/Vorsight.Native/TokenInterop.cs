using System;
using System.Runtime.InteropServices;

namespace Vorsight.Native
{
    /// <summary>
    /// P/Invoke declarations for Windows access token manipulation.
    /// Used to elevate privileges for system operations.
    /// </summary>
    public static class TokenInterop
    {
        /// <summary>
        /// Enables or disables a privilege in an access token.
        /// Required for operations like SE_SHUTDOWN_NAME.
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern bool AdjustTokenPrivileges(
            IntPtr TokenHandle,
            bool DisableAllPrivileges,
            ref TOKEN_PRIVILEGES NewState,
            uint BufferLength,
            IntPtr PreviousState,
            IntPtr ReturnLength);

        /// <summary>
        /// Looks up the privilege ID for a given privilege name.
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern bool LookupPrivilegeValue(
            string? lpSystemName,
            string lpName,
            out long lpLuid);

        /// <summary>
        /// Gets information about an access token.
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern bool GetTokenInformation(
            IntPtr TokenHandle,
            TOKEN_INFORMATION_CLASS TokenInformationClass,
            IntPtr TokenInformation,
            uint TokenInformationLength,
            out uint ReturnLength);

        /// <summary>
        /// Privilege names for use with LookupPrivilegeValue.
        /// </summary>
        public const string SE_SHUTDOWN_NAME = "SeShutdownPrivilege";
        public const string SE_DEBUG_NAME = "SeDebugPrivilege";
        public const string SE_IMPERSONATE_NAME = "SeImpersonatePrivilege";
        public const string SE_TCB_NAME = "SeTcbPrivilege";

        /// <summary>
        /// Token privilege structure.
        /// </summary>
        [StructLayout(LayoutKind.Sequential)]
        public struct LUID
        {
            public uint LowPart;
            public int HighPart;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct LUID_AND_ATTRIBUTES
        {
            public LUID Luid;
            public uint Attributes;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct TOKEN_PRIVILEGES
        {
            public uint PrivilegeCount;
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 1)]
            public LUID_AND_ATTRIBUTES[] Privileges;
        }

        /// <summary>
        /// Token information classes.
        /// </summary>
        public enum TOKEN_INFORMATION_CLASS
        {
            TokenUser = 1,
            TokenGroups = 2,
            TokenPrivileges = 3,
            TokenOwner = 4,
            TokenPrimaryGroup = 5,
            TokenDefaultDacl = 6,
            TokenSource = 7,
            TokenType = 8,
            TokenImpersonationLevel = 9,
            TokenStatistics = 10,
            TokenRestrictedSids = 11,
            TokenSessionId = 12,
            TokenGroupsAndPrivileges = 13,
            TokenSessionReference = 14,
            TokenSandBoxInert = 15,
            TokenAuditPolicy = 16,
            TokenOrigin = 17,
            TokenElevationType = 18,
            TokenLinkedToken = 19,
            TokenElevated = 20,
            TokenHasRestrictions = 21,
            TokenAccessInformation = 22,
            TokenVirtualizationAllowed = 23,
            TokenVirtualizationEnabled = 24,
            TokenIntegrityLevel = 25,
            TokenUIAccess = 26,
            TokenMandatoryPolicy = 27,
            TokenLogonSid = 28,
            TokenIsAppContainer = 29,
            TokenCapabilities = 30,
            TokenAppContainerSid = 31,
            TokenAppContainerNumber = 32,
            TokenUserClaimAttributes = 33,
            TokenDeviceClaimAttributes = 34,
            TokenRestrictedUserClaimAttributes = 35,
            TokenRestrictedDeviceClaimAttributes = 36,
            TokenDeviceGroups = 37,
            TokenRestrictedDeviceGroups = 38,
            TokenSecurityAttributes = 39,
            TokenIsRestricted = 40,
            TokenProcessTrustLevel = 41,
            TokenPrivateNameSpace = 42,
            TokenSingletonAttributes = 43,
            TokenBnoIsolation = 44,
            TokenChildProcessFlags = 45,
            TokenIsLessPrivilegedAppContainer = 46,
            TokenIsSandboxed = 47,
            TokenOriginatingProcessTrustLevel = 48,
            MaxTokenInfoClass = 49
        }

        /// <summary>
        /// Privilege attributes.
        /// </summary>
        public const uint SE_PRIVILEGE_ENABLED = 0x00000002;
        public const uint SE_PRIVILEGE_ENABLED_BY_DEFAULT = 0x00000001;
        public const uint SE_PRIVILEGE_REMOVED = 0x00000004;
    }
}

