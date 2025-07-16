
const { test, expect, _electron: electron } = require('@playwright/test');
const ChatWindowPage = require('./page-objects/ChatWindowPage');
const FloatingIconPage = require('./page-objects/FloatingIconPage');

test.describe('Lyra AI Chat Window Extended Tests', () => {
  let app;
  let chatWindowPage;
  let floatingIconPage;
  let page;

  test.beforeEach(async () => {
    app = await electron.launch({ args: ['.'] });

    page = await app.waitForEvent('window', async (window) => {
      return window.url().includes('chat-window.html');
    });

    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#messagesContainer', { state: 'visible', timeout: 60000 });

    chatWindowPage = new ChatWindowPage(page);
    floatingIconPage = new FloatingIconPage(app.windows()[0]);

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
    await chatWindowPage.sendMessage('Test message');
    await expect(await chatWindowPage.getLastUserMessage()).toHaveText('Test message');
    await chatWindowPage.waitForResponse();
    await expect(await chatWindowPage.getLastAssistantMessage()).toContainText('This is a mocked API response.');
  });

  test('should not send an empty message', async () => {
    const initialMessageCount = await chatWindowPage.getMessageCount();
    await chatWindowPage.sendMessage('');
    const finalMessageCount = await chatWindowPage.getMessageCount();
    expect(finalMessageCount).toBe(initialMessageCount);
  });

  test('should handle multiple messages and responses', async () => {
    await chatWindowPage.sendMessage('First message');
    await chatWindowPage.waitForResponse();
    await chatWindowPage.sendMessage('Second message');
    await chatWindowPage.waitForResponse();
    await expect(await chatWindowPage.getLastUserMessage()).toHaveText('Second message');
    await expect(await chatWindowPage.getLastAssistantMessage()).toContainText('This is a mocked API response.');
  });

  test('should clear the input field after sending a message', async () => {
    await chatWindowPage.sendMessage('A message');
    await expect(chatWindowPage.messageInput).toBeEmpty();
  });

  test('should display user and assistant messages with correct styling', async () => {
    await chatWindowPage.sendMessage('Styling test');
    await expect(await chatWindowPage.getLastUserMessage()).toHaveClass(/user/);
    await chatWindowPage.waitForResponse();
    await expect(await chatWindowPage.getLastAssistantMessage()).toHaveClass(/assistant/);
  });

  test('should handle API errors gracefully', async () => {
    await page.unroute('**/api.groq.com/openai/v1/chat/completions');
    await page.route('**/api.groq.com/openai/v1/chat/completions', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    await chatWindowPage.sendMessage('Error test');
    await chatWindowPage.waitForResponse();
    await expect(await chatWindowPage.getLastAssistantMessage()).toContainText('Error');
  });

  test('should scroll to the bottom on new message', async () => {
    for (let i = 0; i < 10; i++) {
      await chatWindowPage.sendMessage(`Message ${i}`);
      await chatWindowPage.waitForResponse();
    }
    const isScrolledToBottom = await page.evaluate(() => {
      const container = document.querySelector('#messagesContainer');
      return container.scrollHeight - container.scrollTop === container.clientHeight;
    });
    expect(isScrolledToBottom).toBe(true);
  });

  test('should open chat window when floating icon is clicked', async () => {
    await floatingIconPage.click();
    await expect(page).toBeVisible();
  });

  test('should toggle chat window visibility on icon click', async () => {
    await floatingIconPage.click();
    await expect(page).toBeVisible();
    await floatingIconPage.click();
    await expect(page).toBeHidden();
  });

  test('should maintain message history between window toggles', async () => {
    await chatWindowPage.sendMessage('History test');
    await chatWindowPage.waitForResponse();
    await floatingIconPage.click();
    await floatingIconPage.click();
    await expect(await chatWindowPage.getLastUserMessage()).toHaveText('History test');
    await expect(await chatWindowPage.getLastAssistantMessage()).toContainText('This is a mocked API response.');
  });
});
