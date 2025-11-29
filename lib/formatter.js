const { colors } = require('./constants');

function getSignalQuality(level) {
    const levelNum = parseInt(level);
    if (levelNum >= 4) return `${colors.green}Excellent${colors.reset}`;
    if (levelNum === 3) return `${colors.green}Good${colors.reset}`;
    if (levelNum === 2) return `${colors.yellow}Fair${colors.reset}`;
    if (levelNum === 1) return `${colors.red}Poor${colors.reset}`;
    return `${colors.red}No Signal${colors.reset}`;
}

function formatTable(json, filter) {
    let output = '';

    // Connection Status
    if (!filter || filter === 'all' || filter === 'wan') {
        output += `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}║      Connection Status                ║${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`;
        
        if (json.connection_status && json.connection_status.length > 0) {
            const connStatus = json.connection_status[0].ConnectionStatus;
            const statusText = connStatus === 1 ? `${colors.green}Connected${colors.reset}` : `${colors.red}Disconnected${colors.reset}`;
            output += `  ${colors.yellow}Status:${colors.reset}       ${statusText}\n`;
        }
        
        // Active APN
        if (json.apn_cfg && json.apn_cfg.length > 0) {
            const apn = json.apn_cfg[0];
            const apnStatus = apn.X_ALU_COM_ConnectionState === 1 ? `${colors.green}Active${colors.reset}` : `${colors.red}Inactive${colors.reset}`;
            output += `  ${colors.yellow}APN:${colors.reset}          ${apn.APN}\n`;
            output += `  ${colors.yellow}APN Status:${colors.reset}   ${apnStatus}\n`;
            output += `  ${colors.yellow}IPv4:${colors.reset}         ${apn.X_ALU_COM_IPAddressV4 || 'N/A'}\n`;
            output += `  ${colors.yellow}IPv6:${colors.reset}         ${apn.X_ALU_COM_IPAddressV6 || 'N/A'}\n`;
        }
        
        // Cellular Data Stats
        if (json.cellular_stats && json.cellular_stats.length > 0) {
            const stats = json.cellular_stats[0];
            const rxMB = (stats.BytesReceived / (1024 * 1024)).toFixed(2);
            const txMB = (stats.BytesSent / (1024 * 1024)).toFixed(2);
            output += `  ${colors.yellow}Data RX:${colors.reset}      ${rxMB} MB\n`;
            output += `  ${colors.yellow}Data TX:${colors.reset}      ${txMB} MB\n`;
        }
        output += '\n';
    }

    // WAN IP Status (fallback for old API)
    if (json.wan_ip_status && json.wan_ip_status.length > 0 && (!filter || filter === 'all' || filter === 'wan')) {
        output += `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}║         WAN IP Status                 ║${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`;
        
        const wan = json.wan_ip_status[0];
        const status = wan.gwwanup === 1 ? `${colors.green}UP${colors.reset}` : `${colors.red}DOWN${colors.reset}`;
        output += `  ${colors.yellow}Status:${colors.reset}       ${status}\n`;
        output += `  ${colors.yellow}IPv4:${colors.reset}         ${wan.ExternalIPAddress || 'N/A'}\n`;
        output += `  ${colors.yellow}IPv6:${colors.reset}         ${wan.ExternalIPv6Address || 'N/A'}\n`;
        output += '\n';
    }

    // 5G Cell Stats
    if (!filter || filter === 'all' || filter === '5g') {
        output += `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}║         5G Cell Stats                 ║${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`;
        
        if (json.cell_5G_stats_cfg && json.cell_5G_stats_cfg.length > 0) {
            const stat = json.cell_5G_stats_cfg[0].stat;
            // Check if 5G is actually active (not default values)
            if (stat.RSRPCurrent !== -32768 && stat.SignalStrengthLevel > 0) {
                const signalLevel = getSignalQuality(stat.SignalStrengthLevel);
                output += `  ${colors.yellow}RSRP:${colors.reset}         ${stat.RSRPCurrent} dBm\n`;
                output += `  ${colors.yellow}RSRQ:${colors.reset}         ${stat.RSRQCurrent} dB\n`;
                output += `  ${colors.yellow}SNR:${colors.reset}          ${stat.SNRCurrent} dB\n`;
                output += `  ${colors.yellow}Signal:${colors.reset}       ${signalLevel} (Level ${stat.SignalStrengthLevel})\n`;
                if (stat.Band) output += `  ${colors.yellow}Band:${colors.reset}         ${stat.Band}\n`;
                if (stat.PhysicalCellID) output += `  ${colors.yellow}Cell ID:${colors.reset}      ${stat.PhysicalCellID}\n`;
            } else {
                output += `  ${colors.red}No 5G connection available.${colors.reset}\n`;
            }
        } else {
            output += `  ${colors.red}No 5G stats available.${colors.reset}\n`;
        }
        output += '\n';
    }

    // LTE Cell Stats
    if (!filter || filter === 'all' || filter === 'lte') {
        output += `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}║         LTE Cell Stats                ║${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`;
        
        if (json.cell_LTE_stats_cfg && json.cell_LTE_stats_cfg.length > 0) {
            const stat = json.cell_LTE_stats_cfg[0].stat;
            const signalLevel = getSignalQuality(stat.SignalStrengthLevel);
            output += `  ${colors.yellow}RSRP:${colors.reset}         ${stat.RSRPCurrent} dBm\n`;
            output += `  ${colors.yellow}RSRQ:${colors.reset}         ${stat.RSRQCurrent} dB\n`;
            output += `  ${colors.yellow}RSSI:${colors.reset}         ${stat.RSSICurrent} dBm\n`;
            output += `  ${colors.yellow}SNR:${colors.reset}          ${stat.SNRCurrent} dB\n`;
            output += `  ${colors.yellow}Signal:${colors.reset}       ${signalLevel} (Level ${stat.SignalStrengthLevel})\n`;
            if (stat.Band) output += `  ${colors.yellow}Band:${colors.reset}         ${stat.Band}\n`;
            if (stat.PhysicalCellID) output += `  ${colors.yellow}Cell ID:${colors.reset}      ${stat.PhysicalCellID}\n`;
            if (stat.Bandwidth) output += `  ${colors.yellow}Bandwidth:${colors.reset}    ${stat.Bandwidth}\n`;
        } else {
            output += `  ${colors.red}No LTE stats available.${colors.reset}\n`;
        }
    }

    return output;
}

function formatCompact(json, filter) {
    let output = '';

    if (!filter || filter === 'all' || filter === 'wan') {
        // New API format
        if (json.connection_status && json.connection_status.length > 0) {
            const connStatus = json.connection_status[0].ConnectionStatus === 1 ? 'Connected' : 'Disconnected';
            output += `Status: ${connStatus} | `;
        }
        
        if (json.apn_cfg && json.apn_cfg.length > 0) {
            const apn = json.apn_cfg[0];
            output += `APN: ${apn.APN} | IPv4: ${apn.X_ALU_COM_IPAddressV4 || 'N/A'} | `;
        }
        
        if (json.cellular_stats && json.cellular_stats.length > 0) {
            const stats = json.cellular_stats[0];
            const rxMB = (stats.BytesReceived / (1024 * 1024)).toFixed(1);
            const txMB = (stats.BytesSent / (1024 * 1024)).toFixed(1);
            output += `RX: ${rxMB}MB TX: ${txMB}MB | `;
        }
        
        // Old API format (fallback)
        if (json.wan_ip_status && json.wan_ip_status.length > 0) {
            const wan = json.wan_ip_status[0];
            output += `WAN: ${wan.gwwanup === 1 ? 'UP' : 'DOWN'} | IPv4: ${wan.ExternalIPAddress || 'N/A'} | `;
        }
    }

    if (!filter || filter === 'all' || filter === '5g') {
        if (json.cell_5G_stats_cfg && json.cell_5G_stats_cfg.length > 0) {
            const stat = json.cell_5G_stats_cfg[0].stat;
            if (stat.RSRPCurrent !== -32768 && stat.SignalStrengthLevel > 0) {
                output += `5G: RSRP=${stat.RSRPCurrent} RSRQ=${stat.RSRQCurrent} SNR=${stat.SNRCurrent} | `;
            }
        }
    }

    if (!filter || filter === 'all' || filter === 'lte') {
        if (json.cell_LTE_stats_cfg && json.cell_LTE_stats_cfg.length > 0) {
            const stat = json.cell_LTE_stats_cfg[0].stat;
            output += `LTE: RSRP=${stat.RSRPCurrent} RSRQ=${stat.RSRQCurrent} SNR=${stat.SNRCurrent}`;
        }
    }

    return output;
}

function formatJson(json, filter) {
    let filtered = {};

    if (!filter || filter === 'all') {
        filtered = json;
    } else {
        if (filter === 'wan') {
            filtered.wan_ip_status = json.wan_ip_status;
            filtered.connection_status = json.connection_status;
            filtered.apn_cfg = json.apn_cfg;
            filtered.cellular_stats = json.cellular_stats;
        } else if (filter === '5g') {
            filtered.cell_5G_stats_cfg = json.cell_5G_stats_cfg;
        } else if (filter === 'lte') {
            filtered.cell_LTE_stats_cfg = json.cell_LTE_stats_cfg;
        }
    }

    return JSON.stringify(filtered, null, 2);
}

module.exports = {
    formatTable,
    formatCompact,
    formatJson,
};
