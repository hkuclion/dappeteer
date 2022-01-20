import { Page } from 'puppeteer';

import { GetSingedIn, GetConfirmPage } from '.';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const sign = (
  page: Page,
  getSingedIn: GetSingedIn,
  version?: string,
  getConfirmPage?: () => Promise<Page>,
) => async (): Promise<void> => {
  const confirmPage = await getConfirmPage();

  if (!(await getSingedIn())) {
    throw new Error("You haven't signed in yet");
  }

  const button = await Promise.race([
    confirmPage.waitForSelector('.request-signature__footer__sign-button'),
    confirmPage.waitForSelector('.signature-request-footer button:last-child'),
  ]);
  await button.click();
};
