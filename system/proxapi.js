const https = require('https');
const async = require('async');
const fs    = require('fs');
const querystring = require('querystring');
const proxmoxmodule = require('proxmox-node');

let cfgjson;
try {
    cfgjson = fs.readFileSync('config.json', 'utf8');
} catch (e) {
    cfgjson = '{ "proxmox": { "ip":"", "port": "8006" } }';
    fs.writeFileSync("config.json", cfgjson);
}
const config = JSON.parse(cfgjson);

const proxmox = proxmoxmodule(config.proxmox.ip, config.proxmox.port);
let g_vmlist = [];

const logout = function() {
    g_vmlist = [];
    proxmox.logout();
}

const saveconfig = function(body) {
    config.proxmox.ip = body.hostname;
    config.proxmox.port = body.port;
    cfgjson = JSON.stringify(config);
    fs.writeFileSync("config.json", cfgjson);
    proxmox.config(config.proxmox.ip, config.proxmox.port);
}

const domains = function(callback) {
    //enum nodes
    proxmox.callApi('/access/domains', function (err, domains) {
        if (err) {
            return callback(err);
        } else {
            return callback(null,domains.data);
        }
    });
}

const listvms = function (callback) {
    //enum nodes
    proxmox.get('/nodes/', function (err, nodes) {
        if (err) {
            return callback(err);
        } else {
            //enum vms
            if (nodes && Array.isArray(nodes.data)) {
                let vmlist = [];
                async.each(nodes.data, function (node, nodecb) {//foreach node get vm list
                    const url = '/nodes/' + node.node + '/qemu/';
                    proxmox.get(url, function (err, vms) {
                        if (err) {
                            nodecb(err);
                        } else {
                            vms.data.forEach(vm => {
                                vm.node = node.node;
                                vm.running = vm.status == 'running';
                                vmlist.push(vm);
                            });
                            nodecb();
                        }
                    });
                }, function (err) {
                    vmlist.sort((a, b) => (a.vmid > b.vmid) ? 1 : -1);
                    g_vmlist = vmlist; //cache the last vmlist
                    return callback(err, vmlist);
                });
            } else {
                const error = new Error('nodes list invalid');
                return callback(error);
            }
        }
    });
};

const getvmip = function(vm, callback)
{
    let ipv4 = '';
    ///nodes/{node}/qemu/{vmid}/agent/network-get-interfaces
    const url = '/nodes/' + vm.node + '/qemu/' + vm.vmid + '/agent/network-get-interfaces/';
    proxmox.get(url, function (err, net) {
        if (!err) {
            net.data.result.forEach(function (addr) {
                if (addr.name == 'Ethernet') {
                    addr['ip-addresses'].forEach(function (ip) {
                        if (ip['ip-address-type'] == 'ipv4')
                            ipv4 = ip['ip-address'];
                    });
                }
            });
        }
        callback(err, ipv4);
    });
}

const vmpower = function(vm, action, callback)
{
    var body = { node: vm.node, vmid: vm.vmid };
    body = querystring.stringify(body);
    const url = '/nodes/' + vm.node + '/qemu/' + vm.vmid + '/status/' + action;
    proxmox.post(url, body, function(err, res) {//this API will return an UPID used to query the status/progress of the task
        if(err)
            return callback(err);
        let upid = encodeURIComponent(res.data);
        const stsurl = '/nodes/' + vm.node + '/tasks/' + upid + '/status';
        var timeout = setTimeout(function() {
            proxmox.get(stsurl,function(stserr, status) {
                if(status.data.exitstatus == 'OK') {
                    var url = '/nodes/' + vm.node + '/qemu/' + vm.vmid + '/status/current'
                    clearInterval(this);
                    timeout = setTimeout(function () {
                        proxmox.get(url, function (err, current) {
                            if(current.data.status ='running') {
                                callback(null, current);
                            }
                        });
                    }, 3000);
                }
            });
        }, 3000);
    });
}
/*
console.log(config);
config.user = 'ettorer';
config.password = 'Vmware.0';
config.realm = 'tapvdi';

listvms(config, function(err, list) {
    if(err) {
        console.log(err);
    } else {
        console.log(list);
        //create html for webpage
    }
});
*/
module.exports = {
    enumvm: listvms,
    login:  proxmox.login,
    logout: logout,
    vmlist: function() {
         return g_vmlist;
    },
    domains: domains,
    getvmip: getvmip,
    vmpower: vmpower,
    saveconfig: saveconfig,
    config: config
}
