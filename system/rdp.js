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
    if(thevm.status == 'stopped') {//the vm is off
        proxapi.vmpower(thevm, 'start', function(err) {
            if(err) {
                return callback(err);
            }
            return continuestart(thevm, credentials, callback);
        });
    } else 
        return continuestart(thevm, credentials, callback);
}

const continuestart = function (thevm, credentials, callback)
{ 
    proxapi.getvmip(thevm, function(err, ip) {
        //TODO: if the vm is off then turn on and wait for rdp port availability
        const hostname = (err) ? thevm.name : ip;
        const opts = {
            service: "TERMSRV/" + hostname,
            account: (credentials.domain.length) ? credentials.domain + "\\" + credentials.username : credentials.username,
            password: credentials.password
        };

        cred.setCredentials(opts, function (err) {
            if (err) {
                console.log(err);
                return;
            } else {
                exec('mstsc /v:' + hostname, function (error, stdout, stderr) {
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
    })
}

module.exports = startrdp;