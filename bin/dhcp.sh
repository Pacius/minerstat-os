#!/bin/bash
echo ""
echo "*** Auto DHCP Configuration ***"
echo ""

sudo su -c "rm /etc/netplan/minerstat.yaml"

INTERFACE="$(sudo cat /proc/net/dev | grep -vE "lo|docker0" | tail -n1 | awk -F '\\:' '{print $1}' | xargs)"

echo "Configuring LAN DHCP for: "$INTERFACE
echo ""

sudo su -c "echo -n > /etc/network/interfaces"
sudo su -c "echo allow-hotplug $INTERFACE  >> /etc/network/interfaces"
sudo su -c "echo iface $INTERFACE inet dhcp  >> /etc/network/interfaces"

# CloudFlare DNS
sudo su -c '/etc/init.d/networking restart'
sudo su -c "systemctl restart systemd-networkd"
sudo ifdown $INTERFACE
sudo nohup ifup $INTERFACE &

sudo su -c 'echo "" > /etc/resolv.conf' 2>&1 >/dev/null
#sudo resolvconf -u
sudo su -c 'echo "nameserver 1.1.1.1" >> /etc/resolv.conf' 2>&1 >/dev/null
sudo su -c 'echo "nameserver 1.0.0.1" >> /etc/resolv.conf' 2>&1 >/dev/null
sudo su -c 'echo "nameserver 8.8.8.8" >> /etc/resolv.conf' 2>&1 >/dev/null
sudo su -c 'echo "nameserver 8.8.4.4" >> /etc/resolv.conf' 2>&1 >/dev/null
# China
sudo su -c 'echo "nameserver 114.114.114.114" >> /etc/resolv.conf' 2>&1 >/dev/null
sudo su -c 'echo "nameserver 114.114.115.115" >> /etc/resolv.conf' 2>&1 >/dev/null
# For msos versions what have local DNS cache
#sudo su -c 'echo "nameserver 127.0.0.1" >> /etc/resolv.conf' 2>&1 >/dev/null
# IPV6
sudo su -c 'echo nameserver 2606:4700:4700::1111 >> /etc/resolv.conf' 2>&1 >/dev/null
sudo su -c 'echo nameserver 2606:4700:4700::1001 >> /etc/resolv.conf' 2>&1 >/dev/null
# systemd resolve casusing problems with 127.0.0.53
sudo su -c 'echo "nameserver 1.1.1.1" > /run/resolvconf/interface/systemd-resolved' 2>&1 >/dev/null
sudo su -c 'echo "nameserver 1.0.0.1" >> /run/resolvconf/interface/systemd-resolved' 2>&1 >/dev/null
sudo su -c 'echo "nameserver 1.1.1.1" > /run/systemd/resolve/stub-resolv.conf' 2>&1 >/dev/null
sudo su -c 'echo "nameserver 1.0.0.1" >> /run/systemd/resolve/stub-resolv.conf' 2>&1 >/dev/null
sudo su -c 'echo options edns0 >> /run/systemd/resolve/stub-resolv.conf' 2>&1 >/dev/null

echo ""
sleep 3
TEST="$(ping api.minerstat.com -w 1 | grep '1 packets transmitted')"

if echo "$TEST" | grep "0%" ;then
  echo ""
  echo "Success! You have active internet connection."
else
  echo ""
  echo "Oh! Something went wrong, you are not connected to the internet."
  sudo su -c "systemctl restart systemd-networkd"
fi

if [ "$INTERFACE" = "eth0" ]; then
  sudo echo "network:" > /etc/netplan/minerstat.yaml
  sudo echo " version: 2" >> /etc/netplan/minerstat.yaml
  sudo echo " renderer: networkd" >> /etc/netplan/minerstat.yaml
  sudo echo " ethernets:" >> /etc/netplan/minerstat.yaml
  sudo echo "   eth0:" >> /etc/netplan/minerstat.yaml
  sudo echo "     dhcp4: yes" >> /etc/netplan/minerstat.yaml
  sudo echo "     dhcp-identifier: mac" >> /etc/netplan/minerstat.yaml
  sudo echo "     dhcp6: no" >> /etc/netplan/minerstat.yaml
  sudo echo "     nameservers:" >> /etc/netplan/minerstat.yaml
  sudo echo "         addresses: [1.1.1.1, 1.0.0.1]" >> /etc/netplan/minerstat.yaml
  sudo /usr/sbin/netplan apply
fi

echo ""
echo "*** https://minerstat.com ***"
echo ""
