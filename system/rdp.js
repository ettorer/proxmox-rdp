var cred = require("rdpcred");
var exec = require('child_process').exec;
const proxapi = require('./proxapi');

const startrdp = function(vmid, credentials, callback) {
    const vmlist = proxapi.vmlist();
    let thevm = null;
    vmlist.forEach(function(vm){
        if(vm.vmid == vmid)
            thevm = vm;
    })
    if(!thevm) {
        const err = new Error('vm not found');
        return callback(err);
    }
    //TODO: if the vm is off then turn on and wait for rdp port availability
    var opts = {
        service: "TERMSRV/" + thevm.name,
        account: (credentials.domain.length) ? credentials.domain + "\\" + credentials.username : credentials.username,
        password: credentials.password
    };

    cred.setCredentials(opts, function (err) {
        if (err) {
            console.log(err);
            return;
        } else {
            exec('mstsc /v:' + thevm.name, function(error, stdout, stderr) {
                delete opts.password;
                cred.deleteCredentials(opts, function (err) {
                    if (err)
                        console.log(err);
                    return;
                });
            });
        }
    });
    callback(null);
}

module.exports = startrdp;