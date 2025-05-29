
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page1 = await browser.newPage();
  const page2 = await browser.newPage();

  await page1.goto("http://localhost:3000/quiz.html");
  await page2.goto("http://localhost:3000/quiz.html");

  await page1.type("#username", "Player1");
  await page1.click("#submit-name");

  await page2.type("#username", "Player2");
  await page2.click("#submit-name");

  await page1.waitForSelector("#users li");
  await page2.waitForSelector("#users li");

  // Player1 challenges Player2
  await page1.click("#users li");

  // Wait for Player2 to accept challenge
  await page2.waitForSelector("#challengeModal.show");
  await page2.click("#accept-btn");

  // Handle "alert" for both players
  page1.on("dialog", async dialog => { await dialog.dismiss(); });
  page2.on("dialog", async dialog => { await dialog.dismiss(); });

  // Loop through expected number of questions
  for (let i = 0; i < 5; i++) {
    // Wait for questions to show up
    await page1.waitForSelector("#question-box button");
    await page2.waitForSelector("#question-box button");

    // Player1 answers first option, Player2 answers second option after slight delay
    await page1.click("#question-box button:nth-child(2)");
    await new Promise(res => setTimeout(res, 200));
    await page2.click("#question-box button:nth-child(3)");

    // Wait for round result alert
    await new Promise(res => setTimeout(res, 6000));
  }

  await new Promise(res => setTimeout(res, 5000));
  await browser.close();
})();
