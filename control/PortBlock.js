/*    Copyright 2016 Firewalla LLC 
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

const log = require("../net2/logger.js")(__filename);
const Promise = require('bluebird');

const rclient = require('../util/redis_manager.js').getRedisClient()

const DNSMASQ = require('../extension/dnsmasq/dnsmasq.js');

const exec = require('child-process-promise').exec

const blockedPortsKey = 'blockedPorts';

class PortBlock {

  portsToStr(ports) {
    return ports.join(',')
  }

  commandToBlockPorts(ports) {
    return `sudo iptables -I FW_BLOCK -p all -m multiport --destination-port ${ports} -j REJECT`
  }

  commandToUnblockPorts(ports) {
    return `sudo iptables -D FW_BLOCK -p all -m multiport --destination-port ${ports} -j REJECT`
  }

  async blockPort(port, options) {
    options = options || {}
    
    // this policy has scope
    if(options.macSet) {
      // TODO
    } else {
      blocked = await rclient.zrangeAsync(blockedPortsKey, 0, -1)
      if (port in blocked) {
        log.info(`port ${port} is already blocked.`)
        return
      }
      
      if (blocked) {
        await exec(this.commandToUnblockPorts(this.portsToStr(blocked)))
      }

      await rclient.zaddAsync(blockedPortsKey, new Date() / 1000, port)
      blocked = await rclient.zrangeAsync(blockedPortsKey, 0, -1)
      await exec(this.commandToBlockPorts(this.portsToStr(blocked)))
    }
  }

  async unblockPort(category, options) {
    options = options || {}

    // this policy has scope
    if(options.macSet) {
      // TODO
    } else {
      blocked = await rclient.zrangeAsync(blockedPortsKey, 0, -1)
      if (!(port in blocked)) {
        log.info(`port ${port} is not blocked.`)
      }
      
      await exec(this.commandToUnblockPorts(this.portsToStr(blocked)))

      await rclient.zremAsync(blockedPortsKey, port)
      blocked = await rclient.zrangeAsync(blockedPortsKey, 0, -1)
      if (blocked) {
        await exec(this.commandToBlockPorts(this.portsToStr(blocked)))
      }
    }
    
  }
  
}

module.exports = () => new PortBlock()
