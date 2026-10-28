/** Tiny real 1x1 PNGs (red and blue), base64 encoded. */
export const RED_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
export const BLUE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgaPgPAAIDAYAkYfWXAAAAAElFTkSuQmCC';

export const dataUrl = (b64: string) => `data:image/png;base64,${b64}`;

const page = (body: string) =>
  `<!DOCTYPE html>\n<html>\n<head>\n<title>My Basic HTML Page</title>\n</head>\n<body>${body}</body>\n</html>`;

export const SINGLE_NEW = page(
  [
    `<img src='${dataUrl(RED_PNG)}' alt='Closing Stock Price Over Time'>`,
    `<img src='${dataUrl(BLUE_PNG)}' alt='Closing Stock Prices by Year'>`,
    `<img src='${dataUrl(RED_PNG)}' alt='Correlation Between Stock Prices'>`,
    `<img src='${dataUrl(BLUE_PNG)}' alt='Distribution of Closing Stock Price'>`,
    `<img src='${dataUrl(RED_PNG)}' alt='Daily Returns'>`,
  ].join(''),
);

export const MULTI_NEW = page(
  `<img src='${dataUrl(BLUE_PNG)}' alt='Closing Stock Price of Multiple Companies Over Time'>`,
);

/** The format the backend shipped before alt attributes existed. */
export const SINGLE_OLD = page(
  `<img src='${dataUrl(RED_PNG)}'><img src='${dataUrl(BLUE_PNG)}'><img src='${dataUrl(RED_PNG)}'>`,
);

export const EDA_ERROR = page(
  `<div class="eda-error" role="alert">No data found for XYZ between 2024-01-01 and 2024-02-01</div>`,
);

export const CRASH_JSON = JSON.stringify({
  errorMessage: "'NoneType' object is not subscriptable",
  errorType: 'TypeError',
  stackTrace: [],
});

/** Hostile or broken content that must never become a chart. */
export const HOSTILE = page(
  [
    `<script>window.__pwned = true</script>`,
    `<img src='https://evil.example/x.png' alt='Remote'>`,
    `<img src='data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' alt='SVG'>`,
    `<img src='data:image/png;base64,not base64!!' alt='Broken'>`,
    `<img src=x onerror="window.__pwned = true">`,
    `<img src='${dataUrl(RED_PNG)}' alt='Real chart'>`,
  ].join(''),
);
