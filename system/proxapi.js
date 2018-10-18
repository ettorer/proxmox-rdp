const https = require('https');
const async = require('async');
const fs    = require('fs');
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
                                vmlist.push(vm);
                            });
                            nodecb();
                        }
                    });
                }, function (err) {
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
    login: proxmox.login,
    logout: logout,
    vmlist: function(){
         return g_vmlist;
        }
    }
