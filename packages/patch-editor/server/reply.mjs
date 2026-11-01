/** What every sidecar route needs to read a request and answer it. */

export class LibraryError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const bad = (m) => new LibraryError(m, 400);

export const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

export const readBody = (req) => new Promise((ok, no) => {
  // The phone has no stream to read: the page hands the body over whole.
  if (typeof req.bodyText === 'string') { ok(req.bodyText); return; }
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    // A patch that will not fit over the mesh is 8 KB. A megabyte is not a patch.
    if (size > 1_048_576) { no(bad('body too large for a patch')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
  req.on('error', no);
});
