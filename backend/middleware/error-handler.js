export function sendDatabaseError(
  res,
  message,
  err
) {
  console.error(
    message,
    err
  );

  return res
    .status(500)
    .json({
      error:
        message,

      code:
        err.code,

      sqlMessage:
        err.sqlMessage,

      details:
        err.message,
    });
}


export function sendLocationError(
  res,
  err
) {
  if (
    err.status
  ) {
    return res
      .status(
        err.status
      )
      .json({
        error:
          err.message,
      });
  }

  return sendDatabaseError(
    res,
    "Failed to validate location.",
    err
  );
}
