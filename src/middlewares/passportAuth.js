import passport from 'passport';

export default strategyName => (req, res, next) => {
  const state = JSON.parse(req.query.state);
  if(state.env === "native"){
    return passport.authenticate(
      strategyName,
      {
        failureRedirect: `/auth/${strategyName}`,
        session: false
      },
      (err, user) => {
        console.log(user);
        req.user = user;
        next();
      }
    )(req, res, next)
  }
  else{
    return passport.authenticate(
      strategyName,
      {
        failureRedirect: '/user/login',
        session: false
      },
      (err, user) => {
        req.user = user;
        next();
      }
    )(req, res, next)
  }
}
