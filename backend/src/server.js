const { createApp } = require("./app");
const { port } = require("./config/appConfig");

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`CalTrackr API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start CalTrackr API", error);
    process.exit(1);
  });
