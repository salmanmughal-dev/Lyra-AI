
class FloatingIconPage {
  constructor(page) {
    this.page = page;
    this.icon = page.locator('#floating-icon');
  }

  async click() {
    await this.icon.click();
  }

  async getPosition() {
    return await this.icon.boundingBox();
  }
}

module.exports = FloatingIconPage;
