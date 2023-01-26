import puppeteer from "puppeteer";

export function readingTime(content) {
  const wordsPerMinute = 200; // average reading speed
  const numberOfWords = content.split(" ").length;
  const readingTime = Math.ceil(numberOfWords / wordsPerMinute);
  return readingTime;
}

export function estimateReadTime(content) {
  const wordsPerMinute = 200; // average reading speed
  const text = content.replace(/<[^>]*>/g, ""); // remove html tags
  const numberOfWords = text.split(" ").length;
  const readingTime = Math.ceil(numberOfWords / wordsPerMinute);
  return readingTime;
}

export const createPostPdf = async (post) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(`
      <html>
        <head>
          <style>
            /* Add styles for formatting the PDF */
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 20px;
            }
            h1 {
              text-align: center;
            }
            img {
              display: block;
              margin: 0 auto;
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          <img src="${post.cover}" alt="Post Image">
          <h1>${post.title}</h1>
          <p>${post.content}</p>
        </body>
      </html>
    `);
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true
  });
  await browser.close();
  return pdfBuffer;
};
