
class ChatWindowPage {
  constructor(page) {
    this.page = page;
    this.messageInput = page.locator('#messageInput');
    this.sendBtn = page.locator('#sendBtn');
    this.messagesContainer = page.locator('#messagesContainer');
  }

  async sendMessage(message) {
    await this.messageInput.fill(message);
    await this.sendBtn.click();
  }

  async getLastUserMessage() {
    return this.page.locator('.message.user .message-bubble').last();
  }

  async getLastAssistantMessage() {
    return this.page.locator('.message.assistant .message-bubble').last();
  }

  async waitForResponse() {
    await this.page.waitForSelector('.message.assistant .message-bubble');
  }

  async getMessageCount() {
    return await this.page.locator('.message').count();
  }
}

module.exports = ChatWindowPage;
