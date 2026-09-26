const authService = require('../services/authService');

exports.login = async (req, res) => res.json(await authService.login(req.body.email, req.body.password));
exports.me = async (req, res) => res.json(req.user);
