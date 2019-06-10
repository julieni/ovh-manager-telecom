angular.module('managerApp').controller('TelecomTelephonyServicePortabilityMandateAttachCtrl',
  class TelecomTelephonyServicePortabilityMandateAttachCtrl {
    constructor($q, $stateParams, $timeout, $translate, $uibModalInstance, OvhApiTelephony,
      TucToast, data) {
      this.$translate = $translate;
      this.$uibModalInstance = $uibModalInstance;
      this.TucToast = TucToast;
      this.OvhApiTelephony = OvhApiTelephony;
      this.$stateParams = $stateParams;
      this.data = data;
      this.$q = $q;
      this.$timeout = $timeout;
    }

    $onInit() {
      this.isLoading = false;
      this.hasChecked = false;
    }

    attachMandate() {
      this.isLoading = true;
      console.log(this.data);
      return this.$q.all({
        noop: this.$timeout(angular.noop, 1000),
        upload: this.OvhApiTelephony.Portability().PortabilityDocument().v6().create({
          billingAccount: this.$stateParams.billingAccount,
          id: this.data.id,
        }, {
          name: this.uploadedFile.name,
        }),
      }).then((response) => {
        console.log(response);
        this.$uibModalInstance.close(response.data);
      }).catch((error) => {
        this.$uibModalInstance.dismiss(error);
      }).finally(() => { this.isLoading = false; });
    }

    cancel() {
      this.$uibModalInstance.dismiss();
    }

    checkValidFileExtention(file) {
      const pdfType = '.pdf';
      const fileName = file ? file.name : '';
      this.validFormatFile = _.endsWith(fileName.toLowerCase(), pdfType);
      this.hasChecked = true;

      return this.validFormatFile;
    }
  });
