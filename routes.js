const router = require('express').Router();
const { homePage } = require('./controllers');

router.get('/', homePage);

module.exports = router;
