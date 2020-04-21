/*
	GLOBAL FUNCTION's
*/
"use strict";
global.path = __dirname;
global.timeout;
global.gputype;
global.configtype = "simple";
global.isalgo = "NO";
global.cpuDefault;
global.minerType;
global.minerOverclock;
global.minerCpu;
global.dlGpuFinished;
global.dlCpuFinished;
global.chunkCpu;
global.benchmark;
global.benchmark = false;
global.minerRunning;
global.B_ID;
global.B_HASH;
global.B_DURATION;
global.B_CLIENT;
global.B_CONFIG;
global.PrivateMiner;
global.PrivateMinerURL;
global.PrivateMinerType;
global.PrivateMinerConfigFile;
global.PrivateMinerStartFile;
global.PrivateMinerStartArgs;
global.watchnum = 0;
global.osversion;
global.memoryloc;
global.minerVersion;
global.cpuVersion;
var colors = require('colors'),
  exec = require('child_process').exec,
  fs = require('fs'),
  path = require('path'),
  pump = require('pump'),
  sleep = require('sleep'),
  tools = require('./tools.js'),
  monitor = require('./monitor.js'),
  settings = require("./config.js"),
  generateMemory = exec("sudo rm /home/minerstat/minerstat-os/bin/amdmeminfo.txt; sudo /home/minerstat/minerstat-os/bin/amdmeminfo -s -o -q > /home/minerstat/minerstat-os/bin/amdmeminfo.txt; sudo chmod 777 /home/minerstat/minerstat-os/bin/amdmeminfo.txt", function(error, stdout, stderr) {});
const chalk = require('chalk');

/*
	CATCH ERROR's
*/
process.on('SIGINT', function() {
  var execProc = require('child_process').exec,
    childrenProc;
  console.log("CTRL + C --> Closing running miner & minerstat");
  tools.killall();
  childrenProc = execProc("SID=$(screen -list | grep minerstat-console | cut -f1 -d'.' | sed 's/[^0-9]*//g'); sudo su -c 'sudo screen -X -S minew quit'; sudo su minerstat -c 'screen -X -S minerstat-console quit' screen -X -S $SID'.minerstat-console' quit;", function(error, stdout, stderr) {
    process.exit();
  });
});
process.on('uncaughtException', function(err) {
  console.log(err);
  var log = err + "";
  if (log.indexOf("ECONNREFUSED") > -1) {
    clearInterval(global.timeout);
    clearInterval(global.hwmonitor);
    tools.restart();
  }
})
process.on('unhandledRejection', (reason, p) => {});

function getDateTime() {
  var date = new Date(),
    hour = date.getHours(),
    min = date.getMinutes(),
    sec = date.getSeconds();
  hour = (hour < 10 ? "0" : "") + hour;
  min = (min < 10 ? "0" : "") + min;
  sec = (sec < 10 ? "0" : "") + sec;
  return hour + ":" + min + ":" + sec;
}

function jsFriendlyJSONStringify(s) {
  return JSON.stringify(s).
  replace(/\\r/g, '\r').
  replace(/\\n/g, '\n').
  replace(/\\t/g, '\t')
}

function setSyncInterval() {
  if (global.benchmark.toString() == "false") {
    global.timeout = setInterval(function() {
      // Start sync after compressing has been finished
      if (global.dlGpuFinished == true) {
        var tools = require('./tools.js');
        global.sync_num++;
        tools.fetch(global.client, global.minerCpu, global.cpuDefault);
      }
    }, 10000);
  }
}
module.exports = {
  callBackSync: function(gpuSyncDone, cpuSyncDone) {
    // WHEN MINER INFO FETCHED, FETCH HARDWARE INFO
    //if (global.gputype === "nvidia") {
    //  monitor.HWnvidia(gpuSyncDone, cpuSyncDone);
    //}
    //if (global.gputype === "amd") {
    //  monitor.HWamd(gpuSyncDone, cpuSyncDone);
    //}
    var main = require('./start.js');
    main.callBackHardware(gpuSyncDone, cpuSyncDone);
  },
  callBackHardware: function(gpuSyncDone, cpuSyncDone) {
    // WHEN HARDWARE INFO FETCHED SEND BOTH RESPONSE TO THE SERVER
    var sync = global.sync,
      res_data = global.res_data,
      cpu_data = global.cpu_data;
    //console.log(res_data);         //SHOW SYNC OUTPUT
    // SEND LOG TO SERVER
    //console.log("MINER:" + global.minerVersion + ", CPU:" + global.cpuVersion);
    if (global.benchmark.toString() != 'false' && res_data == "") {
      console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;33m" + global.worker + " (" + global.client + ") blank sync\x1b[0m");
      return "blank";
    }
    var request = require('request');
    //console.log(res_data);
    request.post({
      url: 'https://api.minerstat.com:2053/v2/set_node_config.php?token=' + global.accesskey + '&worker=' + global.worker + '&miner=' + global.client.toLowerCase() + '&ver=4&cpuu=' + global.minerCpu + '&cpud=HASH' + '&os=linux&hwNew=true&currentcpu=' + global.cpuDefault.toLowerCase() + '&hwType=' + global.minerType + '&privateMiner=' + global.PrivateMiner + '&currentMinerVersion=' + global.minerVersion + '&currentCPUVersion=' + global.cpuVersion,
      timeout: 15000,
      form: {
        minerData: res_data,
        cpuData: cpu_data
      }
    }, function(error, response, body) {
      if (error == null) {
        // Process Remote Commands
        var tools = require('./tools.js');

        //check benchmark
        var remcmd = body.replace(" ", "");

        if (global.benchmark.toString() == 'false') {
          tools.remotecommand(remcmd);
        } else {
          if (remcmd == "SETFANS" || remcmd == "BENCHMARKSTOP") {
            tools.remotecommand(remcmd);
          }
        }

        // Display GPU Sync Status
        var sync = gpuSyncDone,
          cpuSync = cpuSyncDone;
        if (sync.toString() === "true") {
          global.watchnum = 0;
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;32m" + global.worker + " (" + global.client + ") synced\x1b[0m");
          //console.log("\x1b[1;94m== \x1b[0m[" + global.minerType + "] \x1b " + hwdatas.replace(/(\r\n|\n|\r)/gm, ""));
        } else {
          if (global.watchnum > 1) {
            console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31m" + global.worker + " (" + global.client + ") not hashing\x1b[0m");
            //console.log("\x1b[1;94m== \x1b[0m[" + global.minerType + "] \x1b " + hwdatas.replace(/(\r\n|\n|\r)/gm, ""));
          }
          global.watchnum++;
        }
        if (global.minerCpu.toString() === "true") {
          if (cpuSync.toString() === "true") {
            console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;32m" + global.worker + " (" + global.cpuDefault.toLowerCase() + ") synced\x1b[0m");
          } else {
	    console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31m" + global.worker + " (" + global.cpuDefault.toLowerCase() + ") not hashing\x1b[0m");
            //console.log("\x1b[1;94m== \x1b[0m[" + global.minerType + "] \x1b " + hwdatas.replace(/(\r\n|\n|\r)/gm, ""));
          }
        }
      } else {
	console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31m" + global.worker + " lost connection (" + error + ")\x1b[0m");
        //console.log("\x1b[1;94m== \x1b[0m[" + global.minerType + "] \x1b " + hwdatas.replace(/(\r\n|\n|\r)/gm, ""));
        sleep.sleep(10);
        console.log('\x1Bc');
      }
      //console.log("\n");
    });
  },
  boot: function(miner, startArgs) {
    var tools = require('./tools.js');
    tools.start(miner, startArgs);
  },
  killall: function() {
    var tools = require('./tools.js');
    tools.killall();
  },
  setsync: function() {
    clearInterval(global.timeout);
    setSyncInterval();
  },
  fetch: function() {
    var tools = require('./tools.js');
    tools.fetch(global.client, global.minerCpu, global.cpuDefault);
  },
  benchmark: function() {
    var tools = require('./tools.js');
    global.benchmark = true;
    tools.benchmark();
  },
  main: function() {
    var tools = require('./tools.js');
    var monitor = require('./monitor.js');
    //tools.killall();
    monitor.detect();
    global.sync;
    global.cpuSync;
    global.res_data;
    global.cpu_data;
    global.sync_num;
    global.sync = new Boolean(false);
    global.cpuSync = new Boolean(false);
    global.sync_num = 0;
    global.res_data = "";
    global.cpu_data = "";
    global.dlGpuFinished = false;
    global.dlCpuFinished = false;
    global.minerRunning = false;

    // OS Version
    global.osversion = "stable";
    fs.readFile("/etc/lsb-release", function(err, data) {
      if (!err) {
        if (data.indexOf('experimental') >= 0) {
          global.osversion = "experimental";
        }
      } else {
        console.log(err);
      }
      console.log("\x1b[1;94m== \x1b[0mOS Version: " + global.osversion);
    });

    // Memory location
    // df -h | grep tmpfs | grep /dev | awk '{print $6}' | xargs
    // global.memoryloc = "/dev/shm";


    //global.watchnum = 0;
    console.log("\x1b[1;94m== \x1b[0mWorker: " + global.worker);
    // GET DEFAULT CLIENT AND SEND STATUS TO THE SERVER
    sleep.sleep(1);
    const https = require('https');
    var needle = require('needle');
    needle.get('https://api.minerstat.com/v2/node/gpu/' + global.accesskey + '/' + global.worker, {
      "timeout": 15000
    }, function(error, response) {
      if (error === null) {
        console.log(response.body);

        if (typeof response.body.error !== 'undefined' && response.body.error.includes("Invalid")) {

          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31mError (Server authentication error)\x1b[0m");
          clearInterval(global.timeout);
          clearInterval(global.hwmonitor);
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31mPlease validate your config.js file\x1b[0m");
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31mor add a worker on my.minerstat.com with the name: " + global.worker + "\x1b[0m");

          console.log("")
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;33mTOKEN: " + global.accesskey + " \x1b[0m");
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;33mWORKER: " + global.worker + " \x1b[0m");
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;33mInvalid AccessKey or Worker not exist. \x1b[0m");
          console.log("")
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;34mRecheck in 30 sec. \x1b[0m");


          sleep.sleep(30);
          tools.restart();

        } else {
          if (global.benchmark.toString() != "true") {
            global.client = response.body.default;
          }
          global.cpuDefault = response.body.cpuDefault;
          global.minerType = response.body.type;
          global.minerOverclock = response.body.overclock;
          global.minerCpu = response.body.cpu;
          try {
            global.PrivateMiner = response.body.private;
            if (global.PrivateMiner == "True") {
              global.PrivateMinerURL = response.body.privateUrl;
              global.PrivateMinerType = response.body.privateType;
              global.PrivateMinerConfigFile = response.body.privateFile;
              global.PrivateMinerStartFile = response.body.privateExe;
              global.PrivateMinerStartArgs = response.body.privateArgs;
            } else {
              global.PrivateMiner = "False";
              global.PrivateMinerURL = "";
              global.PrivateMinerType = "";
              global.PrivateMinerConfigFile = "";
              global.PrivateMinerStartFile = "";
              global.PrivateMinerStartArgs = "";
            }
          } catch (PrivateMinerReadError) {
            global.PrivateMiner = "False";
          }
          // Download miner if needed
          downloadMiners(global.client, response.body.cpu, response.body.cpuDefault);
          // Poke server
          global.configtype = "simple";

          var request = require('request');
          request.get({
            url: 'https://api.minerstat.com:2053/v2/set_node_config.php?token=' + global.accesskey + '&worker=' + global.worker + '&miner=' + global.client.toLowerCase() + '&os=linux&nodel=yes&ver=5&cpuu=' + global.minerCpu + '&currentMinerVersion=undefined&currentCPUVersion=undefined',
            timeout: 15000,
            form: {
              dump: "minerstatOSInit"
            }
          }, function(error, response, body) {
            //console.log("\x1b[1;94m================ MINERSTAT ===============\x1b[0m");
            console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;32mFirst sync ...\x1b[0m");
          });
        }
      } else {
        console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31mError (" + error + ")\x1b[0m");
        clearInterval(global.timeout);
        clearInterval(global.hwmonitor);
        console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;33mWaiting for connection\x1b[0m");
        sleep.sleep(10);
        tools.restart();
      }
    });
    if (global.reboot === "yes") {
      var childp = require('child_process').exec,
        queries = childp("sudo reboot -f", function(error, stdout, stderr) {
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;33mSystem is rebooting\x1b[0m");
        });
    }
    // Remove directory recursively
    function deleteFolder(dir_path) {
      if (fs.existsSync(dir_path)) {
        fs.readdirSync(dir_path).forEach(function(entry) {
          var entry_path = path.join(dir_path, entry);
          if (fs.lstatSync(entry_path).isDirectory()) {
            deleteFolder(entry_path);
          } else {
            fs.unlinkSync(entry_path);
          }
        });
        fs.rmdirSync(dir_path);
      }
    }
    //// DOWNLOAD LATEST STABLE VERSION AVAILABLE FROM SELECTED minerCpu
    async function downloadMiners(gpuMiner, isCpu, cpuMiner) {
      var gpuServerVersion,
        cpuServerVersion,
        gpuLocalVersion,
        cpuLocalVersion,
        dlGpu = false,
        dlCpu = false;
      // Create clients folder if not exist
      var dir = 'clients';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      // Fetch Server Version
      var request = require('request');
      request.get({
        url: 'https://static-ssl.minerstat.farm/miners/linux/version.json',
        timeout: 15000,
      }, function(error, response, body) {
        if (error != null) {
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31mError (" + error + ")\x1b[0m");
          clearInterval(global.timeout);
          clearInterval(global.hwmonitor);
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;33mWaiting for static server\x1b[0m");
          sleep.sleep(10);
          tools.restart();
        } else {
          var parseData = JSON.parse(body);
          if (global.PrivateMiner == "True") {
            gpuServerVersion = global.PrivateMinerURL;
          } else {
            gpuServerVersion = parseData[gpuMiner.toLowerCase()];
          }
          if (isCpu.toString() == "true" || isCpu.toString() == "True") {
            cpuServerVersion = parseData[cpuMiner.toLowerCase()];
          }
          // main Miner Check's
          var dir = 'clients/' + gpuMiner.toLowerCase() + '/msVersion.txt';
          if (fs.existsSync(dir)) {
            fs.readFile(dir, 'utf8', function(err, data) {
              if (err) {
                gpuLocalVersion = "0";
              }
              gpuLocalVersion = data;
              if (gpuLocalVersion == undefined) {
                gpuLocalVersion = "0";
              }
              if (gpuServerVersion == gpuLocalVersion) {
                dlGpu = false;
              } else {
                dlGpu = true;
              }
              // Callback
              callbackVersion(dlGpu, false, false, "gpu", gpuMiner, cpuMiner, gpuServerVersion, cpuServerVersion);
            });
          } else {
            dlGpu = true;
            // Callback
            callbackVersion(dlGpu, false, false, "gpu", gpuMiner, cpuMiner, gpuServerVersion, cpuServerVersion);
          }
          // cpu Miner Check's
          if (isCpu.toString() == "true" || isCpu.toString() == "True") {
            var dir = 'clients/' + cpuMiner.toLowerCase() + '/msVersion.txt';
            if (fs.existsSync(dir)) {
              fs.readFile(dir, 'utf8', function(err, data) {
                if (err) {
                  cpuLocalVersion = "0";
                }
                cpuLocalVersion = data;
                if (cpuLocalVersion == undefined) {
                  cpuLocalVersion = "0";
                }
                if (cpuServerVersion == cpuLocalVersion) {
                  dlCpu = false;
                } else {
                  dlCpu = true;
                }
                // Callback
                callbackVersion(false, true, dlCpu, "cpu", gpuMiner, cpuMiner, gpuServerVersion, cpuServerVersion);
              });
            } else {
              dlCpu = true;
              // Callback
              callbackVersion(false, true, dlCpu, "cpu", gpuMiner, cpuMiner, gpuServerVersion, cpuServerVersion);
            }
          }
        }
      });
    }
    // Function for add permissions to run files
    function applyChmod(minerName, minerType) {
      var chmodQuery = require('child_process').exec;
      try {
        var setChmod = chmodQuery("cd /home/minerstat/minerstat-os/; sudo chmod -R 777 *", function(error, stdout, stderr) {
          //console.log("\x1b[1;94m== \x1b[0mClient Status: \x1b[1;32mPermissions applied (" + minerName.replace("_10", "") + ")\x1b[0m");
          dlconf(minerName.replace("_10", ""), minerType);
        });
      } catch (error) {
        console.error(error);
        var setChmod = chmodQuery("sync; cd /home/minerstat/minerstat-os/; sudo chmod -R 777 *", function(error, stdout, stderr) {
          //console.log("\x1b[1;94m== \x1b[0mClient Status: \x1b[1;32mPermissions applied (" + minerName.replace("_10", "") + ")\x1b[0m");
          dlconf(minerName.replace("_10", ""), minerType);
        });
      }
    }
    // Callback downloadMiners(<#gpuMiner#>, <#isCpu#>, <#cpuMiner#>)
    function callbackVersion(dlGpu, isCpu, dlCpu, callbackType, gpuMiner, cpuMiner, gpuServerVersion, cpuServerVersion) {
      if (callbackType == "gpu") {
        global.minerVersion = gpuServerVersion;
        if (global.PrivateMiner == "True") {
          global.minerVersion = "undefined";
        }
        var request = require('request');
        request.get({
          url: 'https://static-ssl.minerstat.farm/miners/linux/cuda.json',
          timeout: 15000,
        }, function(cudaerror, cudaresponse, cudabody) {

          var minerNameWithCuda = gpuMiner.toLowerCase().replace("_10", "");

          if (cudaerror != "null" && global.osversion == "experimental") {
            var parseData = JSON.parse(cudabody);
            var cudaVersion = parseData[gpuMiner.toLowerCase().replace("_10", "")];

            if (cudaVersion == "10" || cudaVersion == 10) {
              minerNameWithCuda = gpuMiner.toLowerCase().replace("_10", "") + "_10";

            }

          }
          if (dlGpu == true) {
            try {
              if (gpuMiner == "xmr-stak") {
                var xmrConfigQuery = require('child_process').exec;
                var copyXmrConfigs = xmrConfigQuery("cp /home/minerstat/minerstat-os/clients/xmr-stak/amd.txt /tmp; cp /home/minerstat/minerstat-os/clients/xmr-stak/nvidia.txt /tmp; cp /home/minerstat/minerstat-os/clients/xmr-stak/cpu.txt /tmp; cp /home/minerstat/minerstat-os/clients/xmr-stak/config.txt /tmp;", function(error, stdout, stderr) {
                  console.log("XMR-STAK Config Protected");
                  sleep.sleep(1);
                  deleteFolder('clients/' + gpuMiner.toLowerCase().replace("_10", "") + '/');
                  sleep.sleep(2);
                  downloadCore(minerNameWithCuda, "gpu", gpuServerVersion);
                });
              }
              if (gpuMiner == "xmr-stak-randomx") {
                var xmrConfigQuery = require('child_process').exec;
                var copyXmrConfigs = xmrConfigQuery("cp /home/minerstat/minerstat-os/clients/xmr-stak-randomx/amd.txt /tmp; cp /home/minerstat/minerstat-os/clients/xmr-stak-randomx/nvidia.txt /tmp; cp /home/minerstat/minerstat-os/clients/xmr-stak-randomx/cpu.txt /tmp; cp /home/minerstat/minerstat-os/clients/xmr-stak-randomx/config.txt /tmp;", function(error, stdout, stderr) {
                  console.log("XMR-STAK-RANDOMX Config Protected");
                  sleep.sleep(1);
                  deleteFolder('clients/' + gpuMiner.toLowerCase().replace("_10", "") + '/');
                  sleep.sleep(2);
                  downloadCore(minerNameWithCuda, "gpu", gpuServerVersion);
                });
              }
            } catch (copyError) {}
            if (gpuMiner != "xmr-stak" && gpuMiner != "xmr-stak-randomx") {
              sleep.sleep(1);
              deleteFolder('clients/' + gpuMiner.toLowerCase().replace("_10", "") + '/');
              sleep.sleep(2);
              downloadCore(minerNameWithCuda, "gpu", gpuServerVersion);
            }
          } else {
            applyChmod(gpuMiner.toLowerCase().replace("_10", ""), "gpu");
          }

        })
      }
      if (callbackType == "cpu") {
        global.cpuVersion = cpuServerVersion;
        if (global.PrivateMiner == "True") {
          global.cpuVersion = "undefined";
        }
        if (isCpu.toString() == "true" || isCpu.toString() == "True") {
          if (dlCpu == true) {
            deleteFolder('clients/' + cpuMiner.toLowerCase() + '/');
            sleep.sleep(2);
            downloadCore(cpuMiner.toLowerCase(), "cpu", cpuServerVersion);
          } else {
            applyChmod(cpuMiner.toLowerCase(), "cpu");
          }
        }
      }
    }
    // Function for deleting file's
    function deleteFile(file) {
      fs.unlink(file, function(err) {
        if (err) {
          console.error(err.toString());
        } else {
          //console.warn(file + ' deleted');
        }
      });
    }
    // Download latest package from the static server
    async function downloadCore(miner, clientType, serverVersion) {
      var miner = miner;
      var dlURL = 'https://static-ssl.minerstat.farm/miners/linux/' + miner + '.zip';
      var dlURL_type = "zip";
      var fullFileName = "";
      var lastSlash = dlURL.lastIndexOf("/");
      fullFileName = dlURL.substring(lastSlash + 1);
      if (global.PrivateMiner == "True" && miner != "xmrig" && miner != "cpuminer-opt") {
        dlURL = global.PrivateMinerURL;
        if (dlURL.includes(".tar.gz")) {
          dlURL_type = "tar";
        }
        if (!dlURL.includes(".zip")) {
          dlURL_type = "tar"; // for URL rewrite, .tar.gz prefered for private miners
        }
        lastSlash = dlURL.lastIndexOf("/");
        fullFileName = dlURL.substring(lastSlash + 1);
      }
      const download = require('download');
      console.log("\x1b[1;94m== \x1b[0mClient Status: \x1b[1;33mDownloading (" + fullFileName + ")\x1b[0m");

      const execa = require('execa');
      execa.shell("cd /home/minerstat/minerstat-os/; sudo rm -rf clients/" + miner + "; sudo rm " + fullFileName + "; sudo mkdir clients/" + miner + "; sudo chmod 777 clients/" + miner + "; wget " + dlURL, {
        cwd: process.cwd(),
        detached: false,
        stdio: "inherit"
      }).then(result => {
        console.log("Download finished");

        //download(dlURL, global.path + '/').then(() => {
        const decompress = require('decompress');
        console.log("\x1b[1;94m== \x1b[0mClient Status: \x1b[1;32mDownload complete (" + fullFileName + ")\x1b[0m");
        console.log("\x1b[1;94m== \x1b[0mClient Status: \x1b[1;33mDecompressing (" + fullFileName + ")\x1b[0m");

        if (dlURL_type == "zip") {
          console.log("zip detected extract");
          decompress(fullFileName, global.path + '/clients/' + miner.replace("_10", "")).then(files => {
            console.log("\x1b[1;94m== \x1b[0mClient Status: \x1b[1;32mDecompressing complete (" + miner + ")\x1b[0m");
            // Remove .zip
            deleteFile(fullFileName);
            // Store version
            try {
              fs.writeFile('clients/' + miner.replace("_10", "") + '/msVersion.txt', '' + serverVersion.trim(), function(err) {});
            } catch (error) {}
            if (miner == "xmr-stak" || miner == "xmr-stak_10") {
              var xmrConfigQueryStak = require('child_process').exec;
              var copyXmrConfigsStak = xmrConfigQueryStak("cp /tmp/amd.txt /home/minerstat/minerstat-os/clients/xmr-stak/; cp /tmp/cpu.txt /home/minerstat/minerstat-os/clients/xmr-stak/; cp /tmp/nvidia.txt /home/minerstat/minerstat-os/clients/xmr-stak/; cp /tmp/config.txt /home/minerstat/minerstat-os/clients/xmr-stak/;", function(error, stdout, stderr) {
                console.log("XMR-STAK Config Restored");
                applyChmod(miner.replace("_10", ""), clientType);
              });
            }
            if (miner == "xmr-stak-randomx") {
              var xmrConfigQueryStak = require('child_process').exec;
              var copyXmrConfigsStak = xmrConfigQueryStak("cp /tmp/amd.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/; cp /tmp/cpu.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/; cp /tmp/nvidia.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/; cp /tmp/config.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/;", function(error, stdout, stderr) {
                console.log("XMR-STAK-RANDOMX Config Restored");
                applyChmod(miner.replace("_10", ""), clientType);
              });
            }
            // Start miner
            if (miner != "xmr-stak" && miner != "xmr-stak-randomx") {
              applyChmod(miner.replace("_10", ""), clientType);
            }
          });
        }
        if (dlURL_type == "tar") {
          console.log("tar.gz detected extract");

          execa.shell("cd /home/minerstat/minerstat-os/; mkdir clients; mkdir clients/" + miner.replace("_10", "") + "; tar -C /home/minerstat/minerstat-os/clients/" + miner.replace("_10", "") + " -xvf " + fullFileName, {
            cwd: process.cwd(),
            detached: false,
            stdio: "inherit"
          }).then(result => {
            console.log("\x1b[1;94m== \x1b[0mClient Status: \x1b[1;32mDecompressing complete (" + fullFileName + ")\x1b[0m");
            // Remove .zip
            deleteFile(fullFileName);
            // Store version
            try {
              fs.writeFile('clients/' + miner.replace("_10", "") + '/msVersion.txt', '' + serverVersion.trim(), function(err) {});
            } catch (error) {}
            if (miner == "xmr-stak" || miner == "xmr-stak_10") {
              var xmrConfigQueryStak = require('child_process').exec;
              var copyXmrConfigsStak = xmrConfigQueryStak("cp /tmp/amd.txt /home/minerstat/minerstat-os/clients/xmr-stak/; cp /tmp/cpu.txt /home/minerstat/minerstat-os/clients/xmr-stak/; cp /tmp/nvidia.txt /home/minerstat/minerstat-os/clients/xmr-stak/; cp /tmp/config.txt /home/minerstat/minerstat-os/clients/xmr-stak/;", function(error, stdout, stderr) {
                console.log("XMR-STAK Config Restored");
                applyChmod(miner.replace("_10", ""), clientType);
              });
            }
            if (miner == "xmr-stak-randomx") {
              var xmrConfigQueryStak = require('child_process').exec;
              var copyXmrConfigsStak = xmrConfigQueryStak("cp /tmp/amd.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/; cp /tmp/cpu.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/; cp /tmp/nvidia.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/; cp /tmp/config.txt /home/minerstat/minerstat-os/clients/xmr-stak-randomx/;", function(error, stdout, stderr) {
                console.log("XMR-STAK-RANDOMX Config Restored");
                applyChmod(miner.replace("_10", ""), clientType);
              });
            }
            // Start miner
            if (miner != "xmr-stak" && miner != "xmr-stak-randomx") {
              applyChmod(miner.replace("_10", ""), clientType);
            }
          });
        }
      });
    }
    //// GET CONFIG TO YOUR DEFAULT MINER
    async function dlconf(miner, clientType) {

      if (global.benchmark.toString() == 'true') {
        console.log("\x1b[1;94m== \x1b[0mBenchmark Status: \x1b[1;32mActive\x1b[0m");
      } else {
        console.log("\x1b[1;94m== \x1b[0mBenchmark Status: \x1b[1;33mInactive\x1b[0m");
      }

      // MINER DEFAULT CONFIG file
      // IF START ARGS start.bash if external config then use that.
      const MINER_CONFIG_FILE = {
        "bminer": "start.bash",
        "cast-xmr": "start.bash",
        "ccminer-alexis": "start.bash",
        "ccminer-djm34": "start.bash",
        "ccminer-krnlx": "start.bash",
        "ccminer-tpruvot": "start.bash",
        "ccminer-x16r": "start.bash",
        "claymore-eth": "config.txt",
        "claymore-xmr": "config.txt",
        "claymore-zec": "config.txt",
        "cryptodredge": "start.bash",
        "ethminer": "start.bash",
	"kawpowminer": "start.bash",
        "ewbf-zec": "start.bash",
        "ewbf-zhash": "start.bash",
        "lolminer": "user_config.json",
        "lolminer-beam": "start.bash",
        "mkxminer": "start.bash",
        "phoenix-eth": "config.txt",
        "progpowminer": "start.bash",
        "sgminer-avermore": "sgminer.conf",
        "sgminer-gm": "sgminer.conf",
        "teamredminer": "start.bash",
        "trex": "config.json",
        "wildrig-multi": "start.bash",
        "xmr-stak": "pools.txt",
        "xmr-stak-randomx": "pools.txt",
        "xmrig": "config.json",
        "xmrig-randomx": "config.json",
        "xmrig-amd": "start.bash",
        "xmrig-nvidia": "start.bash",
        "z-enemy": "start.bash",
        "zjazz-x22i": "start.bash",
        "zm-zec": "start.bash",
        "gminer": "start.bash",
        "gminer-amd": "start.bash",
        "grinprominer": "config.xml",
        "miniz": "start.bash",
        "serominer": "start.bash",
        "nbminer": "start.bash",
        "nbminer-amd": "start.bash",
        "nanominer": "start.bash",
        "kbminer": "start.bash",
        "ttminer": "start.bash",
        "vkminer": "start.bash",
        "srbminer-multi": "start.bash"
      };

      try {
        global.file = "clients/" + miner.replace("_10", "") + "/" + MINER_CONFIG_FILE[miner.replace("_10", "")];
      } catch (globalFile) {}

      if (global.PrivateMiner == "True") {
        if (global.PrivateMinerConfigFile != "" && clientType != "cpu") {
          global.file = "clients/" + miner.replace("_10", "") + "/" + global.PrivateMinerConfigFile;
        } else {
          global.file = "clients/" + miner.replace("_10", "") + "/start.bash";
        }
      }

      needle.get('https://api.minerstat.com/v2/conf/gpu/' + global.accesskey + '/' + global.worker + '/' + miner.toLowerCase().replace("_10", ""), {
        "timeout": 15000
      }, function(error, response) {
        if (error === null) {
          var str = response.body;
          if (clientType == "cpu") {
            global.chunkCpu = str;
          } else {
            global.chunk = str;
          }
          if (global.benchmark.toString() == "true" && clientType != "cpu") {
            str = global.B_CONFIG;
          }
          miner = miner.replace("_10", "");
          //if (miner != "ewbf-zec" && miner != "cast-xmr" && miner != "gminer" && miner != "wildrig-multi" && miner != "zjazz-x22i" && miner != "mkxminer" && miner != "teamredminer" && miner != "progpowminer" && miner != "bminer" && miner != "xmrig-amd" && miner != "ewbf-zhash" && miner != "ethminer" && miner != "zm-zec" && miner != "z-enemy" && miner != "cryptodredge" && miner.indexOf("ccminer") === -1 && miner.indexOf("cpu") === 1) {
          if (MINER_CONFIG_FILE[miner.toLowerCase()] != "start.bash") {

            var saveFileLocation = "clients/" + miner.replace("_10", "") + "/" + MINER_CONFIG_FILE[miner.toLowerCase()];
            console.log("\x1b[1;94m== \x1b[0mClient Status (" + miner + "): \x1b[1;32mSaving config\x1b[0m");
            if (global.PrivateMinerConfigFile != "" && clientType != "cpu") {
              saveFileLocation = "clients/" + miner.replace("_10", "") + "/" + global.PrivateMinerConfigFile;
            }
            var writeStream = fs.createWriteStream(global.path + "/" + saveFileLocation);

            // This ARRAY only need to fill if the miner using JSON config.
            var stringifyArray = ["sgminer", "sgminer-gm", "sgminer-avermore", "trex", "lolminer", "xmrig", "xmrig-randomx"];
            if (stringifyArray.indexOf(miner) > -1 || global.PrivateMinerConfigFile != "" && clientType != "cpu") {
              str = jsFriendlyJSONStringify(str);
              str = str.replace(/\\/g, '').replace('"{', '{').replace('}"', '}');
              if (str.charAt(0) == '"') {
                str = str.substring(1, str.length - 1); // remove first and last char ""
              }
            }
            writeStream.write("" + str);
            writeStream.end();
            writeStream.on('error', function(wsError) {
              console.log("CONFIG ERROR:" + wsError);
            });
            writeStream.on('finish', function() {
              //tools.killall();
              console.log("\x1b[1;94m== \x1b[0mClient Status (" + miner + "): \x1b[1;32mSaved config to " + saveFileLocation + "\x1b[0m");
              tools.autoupdate(miner, str);
            });
          } else {
            //console.log(response.body);
            //tools.killall();
            tools.autoupdate(miner, str);
          }
          if (clientType == "gpu") {

            if (global.minerType != global.gputype) {
              //console.log("\x1b[1;94m== \x1b[0mHardware Status: \x1b[1;31mError (GPU type mismatch)\x1b[0m");
              //console.log("\x1b[1;94m== \x1b[0m[Online] GPU Type: " + global.minerType);
              //console.log("\x1b[1;94m== \x1b[0m[Local] GPU Type: " + global.gputype);
            }

            console.log("\x1b[1;94m== \x1b[0mMonitor Status: \x1b[1;32mRunning\x1b[0m");

            global.dlGpuFinished = true;
          }
          if (clientType == "cpu") {
            global.dlCpuFinished = true;
          }
        } else {
          // Error (Restart)
          console.log("\x1b[1;94m== \x1b[0m" + getDateTime() + ": \x1b[1;31mError (" + error + ")\x1b[0m");
          clearInterval(global.timeout);
          clearInterval(global.hwmonitor);
          sleep.sleep(10);
          tools.restart();
        }
      });
    }

    /*
    	START LOOP
    	Notice: If you modify this you will 'rate limited' [banned] from the sync server
    */
    (function() {

      if (global.benchmark.toString() == 'true') {
        console.log("\x1b[1;94m== \x1b[0mBenchmark Status: Active");
      } else {
        console.log("\x1b[1;94m== \x1b[0mBenchmark Status: Inactive");
      }

    })();
    /*
    	END LOOP
    */
  }
};
tools.restart();
