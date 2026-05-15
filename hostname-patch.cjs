// Override os.hostname to return ASCII before vercel CLI loads
const os = require('os');
const originalHostname = os.hostname;
os.hostname = function() {
  const h = originalHostname.call(this);
  // Replace non-ASCII with ASCII
  if (/[^\x00-\x7F]/.test(h)) {
    return 'fujik-pc';
  }
  return h;
};
