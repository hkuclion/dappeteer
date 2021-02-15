import * as path from "path";
import * as fs from "fs";
import StreamZip from "node-stream-zip";
import {get} from "https";
import {IncomingMessage} from "http";

const metamaskDirectory = path.resolve(__dirname, "metamask");

export default async (version?: string): Promise<string> => {
  const {filename, downloadUrl, tag} = await getMetamaskReleases(version);
  const extractDestination = path.resolve(metamaskDirectory, tag.replace(/\./g, "_"));
  if (!fs.existsSync(extractDestination)) {
    const downloadedFile = await downloadMetamaskReleases(filename, downloadUrl);
    const zip = new StreamZip.async({ file: downloadedFile });
    fs.mkdirSync(extractDestination);
    await zip.extract(null, extractDestination);
  }
  return extractDestination;
}

const request = (url: string): Promise<IncomingMessage> => new Promise((resolve) => {
  get(url, (response) => {
    if(response.statusCode == 302) {
      get(response.headers.location, resolve);
    } else {
      resolve(response);
    }
  });
});

const downloadMetamaskReleases = (name: string, url: string): Promise<string> => new Promise(async (resolve) => {
  const downloadsDirectory = path.resolve(metamaskDirectory, "download");
  if (!fs.existsSync(downloadsDirectory)) {
    fs.mkdirSync(downloadsDirectory, { recursive: true });
  }
  const fileLocation = path.join(downloadsDirectory, name);
  const file = fs.createWriteStream(fileLocation);
  const stream = await request(url);
  stream.pipe(file);
  stream.on("end", () => {resolve(fileLocation)});
});

type MetamaskReleases = {downloadUrl: string, filename: string, tag: string};
const metamaskReleasesUrl = 'https://api.github.com/repos/metamask/metamask-extension/releases';
const getMetamaskReleases = (version?: string): Promise<MetamaskReleases> => new Promise((resolve, reject) => {
  get(metamaskReleasesUrl, {headers: { 'User-Agent': 'Mozilla/5.0' }},(response) => {
    let body = "";
    response.on("data", (chunk) => {
      body += chunk;
    });
    response.on("end", () => {
      for (const result of JSON.parse(body)) {
        if (result.draft) continue;
        if (!version || result.name.includes(version) || result.tag_name.includes(version)) {
          for (const asset of result.assets) {
            if (asset.name.includes("chrome")) resolve({
              downloadUrl: asset.browser_download_url,
              filename: asset.name,
              tag: result.tag_name,
            });
          }
        }
      }
      reject(`Version ${version} not found!`);
    });
  });
});