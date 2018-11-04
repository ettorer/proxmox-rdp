const cred = require("rdpcred");
const exec = require('child_process').exec;
const proxapi = require('./proxapi');
const os = require('os');

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
        //TODO: wait for rdp server availability by trying a TCP connection on port 3389... 
        const hostname = (err) ? thevm.name : ip;
        const platform = os.platform();
        switch(platform) {
            case 'linux':
                return startlinux(thevm, credentials, hostname, callback);
            case 'win32':
                return startwin32(thevm, credentials, hostname, callback);
            default:
                return callback(new Error('unsupported platform'));
        }
    });
}

const startwin32 = function(thevm, credentials, hostname, callback)
{
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
}

const startlinux = function (thevm, credentials, hostname, callback) 
{
    const account = (credentials.domain.length) ? credentials.domain + "\\\\" + credentials.username : credentials.username;
//    const cmdline = `xfreerdp /v:{hostname} /u:{account} /p:{credentials.password} /cert-ignore /f`;
    const cmdline = "xfreerdp /v:"+ hostname+" /u:"+ account+" /p:"+credentials.password+" /cert-ignore /f";
    console.log(cmdline);
    exec(cmdline, function (error, stdout, stderr) {
        if(error)
            console.log(error);
        if(stdout.length)
            console.log(stdout);
        if(stderr.length)
            console.log(stderr);
    });
    callback(null);
}

module.exports = startrdp;