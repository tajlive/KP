#!/bin/bash
SCRIPT=$ 1
LOG="/Users/taj/klarpakke/logs/script-$SCRIPT.log"
cd /Users/taj/klarpakke || exit 1
echo "Starting $SCRIPT at $( date )" >> $LOG
case $SCRIPT in
  dev) npm run dev >> $LOG 2&>1 & echo $! > /tmp/dev.pid ;;
  test) npm test >> $LOG 2&>1 ;;
  build) npm run build >> $LOG 2&>1 ;;
  *) echo "Ugyldig script: dev|test|build" &>2 ; exit 1 ;;
esac
echo "Log tail:" 
 tail -n 20 $LOG