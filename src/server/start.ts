import { app } from "./index";

const PORT = 3000;

function start() {
  app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
  })
}

start()