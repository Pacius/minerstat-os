# ~/.bashrc: executed by bash(1) for non-login shells.
# see /usr/share/doc/bash/examples/startup-files (in the package bash-doc)
# for examples

# If not running interactively, don't do anything
case $- in
  *i*) ;;
  *) return ;;
esac

# don't put duplicate lines or lines starting with space in the history.
# See bash(1) for more options
HISTCONTROL=ignoreboth

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# If set, the pattern "**" used in a pathname expansion context will
# match all files and zero or more directories and subdirectories.
#shopt -s globstar

# make less more friendly for non-text input files, see lesspipe(1)
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

# set variable identifying the chroot you work in (used in the prompt below)
if [ -z "${debian_chroot:-}" ] && [ -r /etc/debian_chroot ]; then
  debian_chroot=$(cat /etc/debian_chroot)
fi

# set a fancy prompt (non-color, unless we know we "want" color)
case "$TERM" in
  xterm-color|*-256color) color_prompt=yes ;;
esac

# uncomment for a colored prompt, if the terminal has the capability; turned
# off by default to not distract the user: the focus in a terminal window
# should be on the output of commands, not on the prompt
#force_color_prompt=yes

if [ -n "$force_color_prompt" ]; then
  if [ -x /usr/bin/tput ] && tput setaf 1 >&/dev/null; then
    # We have color support; assume it's compliant with Ecma-48
    # (ISO/IEC-6429). (Lack of such support is extremely rare, and such
    # a case would tend to support setf rather than setaf.)
    color_prompt=yes
  else
    color_prompt=
  fi
fi

if [ "$color_prompt" = yes ]; then
  PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
else
  PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '
fi
unset color_prompt force_color_prompt

# If this is an xterm set the title to user@host:dir
case "$TERM" in
  xterm*|rxvt*)
    PS1="\[\e]0;${debian_chroot:+($debian_chroot)}\u@\h: \w\a\]$PS1"
    ;;
  *)
    ;;
esac

# enable color support of ls and also add handy aliases
if [ -x /usr/bin/dircolors ]; then
  test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
  alias ls='ls --color=auto'
  #alias dir='dir --color=auto'
  #alias vdir='vdir --color=auto'

  alias grep='grep --color=auto'
  alias fgrep='fgrep --color=auto'
  alias egrep='egrep --color=auto'
fi

# colored GCC warnings and errors
#export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

# some more ls aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Add an "alert" alias for long running commands.  Use like so:
#   sleep 10; alert
alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'

# Alias definitions.
# You may want to put all your additions into a separate file like
# ~/.bash_aliases, instead of adding them here directly.
# See /usr/share/doc/bash-doc/examples in the bash-doc package.

if [ -f ~/.bash_aliases ]; then
  . ~/.bash_aliases
fi

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi
alias mstart='sudo su minerstat -c "screen -X -S minerstat-console quit" > /dev/null 2>&1; cd /home/minerstat/minerstat-os/; sudo node stop > /dev/null 2>&1; sudo rm /tmp/stop.pid > /dev/null 2>&1; sudo rm /dev/shm/maintenance.pid > /dev/null 2>&1; sleep 1; screen -A -m -d -S minerstat-console sudo sh start.sh; echo "Minerstat has been re(started)! type: miner to check output, anytime!"; sleep 1; screen -x minerstat-console '
alias miner='sudo bash /home/minerstat/minerstat-os/core/miner'
alias agent='sh /home/minerstat/minerstat-os/core/view'
alias mstop='cd /home/minerstat/minerstat-os/; sudo node stop; sudo su minerstat -c "screen -X -S minerstat-console quit"; echo "stop" > /tmp/stop.pid > /dev/null 2>&1; sudo su -c "sudo screen -X -S minew quit"; sudo su -c "echo "" > /dev/shm/miner.log";'
alias mrecovery='cd /home/minerstat/minerstat-os/core/; sudo bash recovery.sh'
alias mupdate='cd /home/minerstat/minerstat-os/; sudo bash git.sh; source ~/.bashrc'
alias mreconf='sudo rm /home/minerstat/minerstat-os/bin/random.txt; sudo nvidia-xconfig -a --allow-empty-initial-configuration --cool-bits=31 --use-display-device="DFP-0" --connected-monitor="DFP-0"; sudo sed -i s/"DPMS"/"NODPMS"/ /etc/X11/xorg.conf; sudo killall Xorg; sudo rm /tmp/.X0-lock; sleep 5; sync; sudo su -c "echo 1 > /proc/sys/kernel/sysrq"; sudo su -c "echo b > /proc/sysrq-trigger";'
alias mhelp='sudo bash /home/minerstat/minerstat-os/bin/help.sh'
alias mreboot='sync; sudo reboot -f'
alias mshutdown='sync; sudo shutdown -h now'
alias forcereboot='sudo su -c "echo 1 > /proc/sys/kernel/sysrq"; sudo su -c "echo b > /proc/sysrq-trigger";'
alias forceshutdown='sudo su -c "echo 1 > /proc/sys/kernel/sysrq"; sudo su -c "echo o > /proc/sysrq-trigger";'
alias mclock='cd /home/minerstat/minerstat-os/bin; sudo bash overclock.sh'
alias mfind='cd /home/minerstat/minerstat-os/bin; sudo bash find.sh'
alias mlang='sudo loadkeys'
alias atiflash='cd /home/minerstat/minerstat-os/bin/; sudo ./atiflash'
alias atidumpall='cd /home/minerstat/minerstat-os/bin/; sudo ./atidumpall.bash'
alias atiflashall='cd /home/minerstat/minerstat-os/bin/; sudo ./atiflashall.bash'
alias minfo='sudo bash /home/minerstat/minerstat-os/core/10-help-text'
alias mswap='sudo /home/minerstat/minerstat-os/core/swap'
alias mworker='sudo /home/minerstat/minerstat-os/core/mworker'
alias mled='sudo /home/minerstat/minerstat-os/core/mled'
alias mwifi='sudo /home/minerstat/minerstat-os/core/mwifi'
alias nvidia-update='sudo /home/minerstat/minerstat-os/core/nvidia-update'
alias autotune='sudo /home/minerstat/minerstat-os/core/autotune'
alias rocm-smi='sudo /home/minerstat/minerstat-os/bin/rocm-smi'
alias netrecovery='sudo su -c "cd /tmp; wget https://labs.minerstat.farm/repo/minerstat-os/-/raw/master/core/recovery.sh; chmod 777 recovery.sh; sh recovery.sh"'
alias mpill='sudo /home/minerstat/minerstat-os/core/mpill'
alias static='sudo bash /home/minerstat/minerstat-os/core/mstatic'
alias dhcp='sudo /home/minerstat/minerstat-os/core/dhcp'
alias wifi='sudo /home/minerstat/minerstat-os/core/mwifi'
alias hugepages='sudo /home/minerstat/minerstat-os/core/hugepages'
alias maintenance='sudo /home/minerstat/minerstat-os/core/maintenance'
alias opencl='sudo /home/minerstat/minerstat-os/core/opencl'

if grep -q experimental "/etc/lsb-release"; then
  alias amdmemtool='sudo /home/minerstat/minerstat-os/bin/amdmemorytweak'
else
  alias amdmemtool='sudo /home/minerstat/minerstat-os/bin/amdmemorytweak-stable'
fi

alias nvflash='sudo /home/minerstat/minerstat-os/bin/nvflash_linux'
