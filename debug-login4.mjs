import { chromium } from 'playwright';

const pw = process.env.PW;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://www.klarpakke.no/no/login', { waitUntil: 'networkidle', timeout: 60000 });
await new Promise(r => setTimeout(r, 5000));

// Sjekk React state og event listeners via devtools protocol
const info = await page.evaluate(() => {
  const btn = document.querySelector('button[type="submit"]');
  const form = document.querySelector('form');
  const emailInput = document.querySelector('input[name="email"]');
  // Finn react fiber
  const fiberKey = btn ? Object.keys(btn).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')) : null;
  const propsKey = btn ? Object.keys(btn).find(k => k.startsWith('__reactProps')) : null;
  const btnProps = propsKey ? btn[propsKey] : null;
  return {
    fiberKey: !!fiberKey,
    propsKey: !!propsKey,
    btnHasOnClick: !!(btnProps && btnProps.onClick),
    formPropsKey: form ? Object.keys(form).find(k => k.startsWith('__reactProps')) : null,
    inputControlled: emailInput ? (Object.keys(emailInput).find(k => k.startsWith('__reactProps')) ? 'has-react-props' : 'no-react-props') : 'no-input',
  };
});
console.log(JSON.stringify(info, null, 2));

const formFiber = await page.evaluate(() => {
  const form = document.querySelector('form');
  const propsKey = form ? Object.keys(form).find(k => k.startsWith('__reactProps')) : null;
  const props = propsKey ? form[propsKey] : null;
  return props ? Object.keys(props) : null;
});
console.log('form react props keys:', formFiber);

await browser.close();
