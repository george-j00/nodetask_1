const express = require('express');
const userRouter = require('./src/routes/user.routes')
const dotenv = require('dotenv');

const app = express();
const port = 3000;
dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/',userRouter)

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

