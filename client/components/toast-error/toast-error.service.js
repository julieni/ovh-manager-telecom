angular.module('managerApp').service('TucToastError', ($translate, $q, TucToast) => function (err, translationId) {
  const output = [$translate.instant(translationId || 'an_error_occured')];

  if (err.status) {
    output.push(`[${err.status}]`);
  }

  if (err.data || err.statusText) {
    output.push((err.data && err.data.message) || err.statusText);
  }

  if (typeof err === 'string') {
    output.push($translate.instant(err));
  }

  TucToast.error(output.join(' '));
  return $q.reject(err);
});
