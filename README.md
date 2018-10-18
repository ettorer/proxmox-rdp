#  Node.js script and simple Web app to start RDP connections (mstsc) to Windows based Proxmox virtual machines, with credential autologin 

  This script allows to browse the quemu virtual machines present in a Proxmox cluster.
  Then it allows to starts Windows RDP client (mstsc) to those Windows VMs.
  The RPD connection SSO into the Windows VM by using the same credentials used to authenticate to proxmox.
  
## Requirements

 * Windows 7 or higher

## Installation

 * npm install
    
## Usage

```javascript
    node app.js or npm start
```

## License GPLv3

Copyright (c) 2018 Ettore Roberto Rizza &lt;er@flydesktop.com&gt;
