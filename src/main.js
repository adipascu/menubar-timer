import { app, Tray, Menu, nativeImage, } from 'electron'
import ansiStyles from 'ansi-styles';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

app.setName('Timer App');

(async () => {
  let interval = null

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

  const resetTimer = (duration) => {
    clearInterval(interval);

    const endTime = Date.now() + duration * 1000;

    const updateTimer = () => {
      const currentTime = Date.now();
      const timeLeft = Math.max(0, Math.round((endTime - currentTime) / 1000));

      if (timeLeft <= 0) {
        clearInterval(interval);
        tray.setTitle("Time's up!");
        interval = flashMenuBar();
      } else {
        tray.setTitle(formatTime(timeLeft));
      }
    };

    updateTimer();
    interval = setInterval(updateTimer, 1000);
  };

  await app.whenReady()
  const tray = new Tray(nativeImage.createEmpty())
  const contextMenu = Menu.buildFromTemplate([
    { label: '5 minutes', click: () => resetTimer(5 * 60) },
    { label: '10 minutes', click: () => resetTimer(10 * 60) },
    { label: '15 minutes', click: () => resetTimer(15 * 60) },
    { label: '20 minutes', click: () => resetTimer(20 * 60) },
    { role: 'quit' }
  ]);
  tray.setContextMenu(contextMenu)

  resetTimer(5);
})()