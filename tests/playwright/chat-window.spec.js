const { test, expect, _electron: electron } = require('@playwright/test');

test.describe('Lyra AI Chat Window', () => {
  let app;
  let page;

  test.beforeEach(async () => {
    app = await electron.launch({ args: ['.'] });
    
    // Wait for the chat window to be created and loaded
    page = await app.waitForEvent('window', async (window) => {
      return window.url().includes('chat-window.html');
    });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#messagesContainer', { state: 'visible', timeout: 60000 });

    // Mock the Groq API to return a predictable response
    await page.route('**/api.groq.com/openai/v1/chat/completions', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [
            {
              message: {
                content: 'This is a mocked API response.',
              },
            },
          ],
        }),
      });
    });
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('should send a message and display the response', async () => {
    await page.fill('#messageInput', 'Test message');
    await page.click('#sendBtn');

    await expect(page.locator('.message.user .message-bubble').last()).toHaveText('Test message');
    await expect(page.locator('.message.assistant .message-bubble').last()).toContainText('This is a mocked API response.');
  });
});