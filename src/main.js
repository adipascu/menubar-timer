import { app, Tray, Menu, nativeImage } from 'electron'
import ansiStyles from 'ansi-styles';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const DURATION = 5;
app.setName('Timer App');

(async () => {
  let secondsLeft = null
  let timer = null
  let flashInterval = null

  const flashMenuBar = () => {
    let isGreen = true;
    return setInterval(() => {
      if (isGreen) {
        tray.setTitle(`${ansiStyles.bgGreen.open}Time's up!${ansiStyles.bgGreen.close}`);
      } else {
        tray.setTitle("Time's up!");
      }
      isGreen = !isGreen;
    }, 500);
  };

  const startTimer = () => {
    secondsLeft = DURATION;
    tray.setTitle(formatTime(secondsLeft));
    timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        tray.setTitle("Time's up!");
        flashInterval = flashMenuBar();
      } else {
        tray.setTitle(formatTime(secondsLeft));
      }
    }, 1000);
  };

  const resetTimer = () => {
    clearInterval(timer);
    clearInterval(flashInterval);
    tray.setTitle("Timer Reset");
    startTimer();
  }

  await app.whenReady()
  const tray = new Tray(nativeImage.createEmpty())
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Reset Timer', type: 'normal', click: resetTimer },
    { role: 'quit' }
  ])
  tray.setContextMenu(contextMenu)

  startTimer()
})()