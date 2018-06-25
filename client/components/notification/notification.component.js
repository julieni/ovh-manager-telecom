angular.module('managerApp')
  .component('notificationList', {
    bindings: {
      ngModel: '=?',
      xdslService: '=',
      errorHandler: '&',
      onChange: '&',
    },
    controllerAs: 'NotificationListCtrl',
    templateUrl: 'components/notification/notification-list.html',
    controller($scope, OvhApiSms, OvhApiXdslNotifications, NotificationElement) {
      const self = this;

      this.loading = true;

      /**
       * Add a new element in Edit mode
       */
      this.addElement = function () {
        const notif = new NotificationElement(
          {
            frequency: self.frequencies[0].name,
            type: self.types[0].name,
            xdslService: self.xdslService,
            smsAccount: self.accounts.length === 1 ? self.accounts[0] : null,
            id: new Date().getTime(),
          },
          true,
        );
        self.ngModel.unshift(notif);
        self.sort = null;
      };

      /**
       * Sort the list of notifications
       * @param {String}  fieldName  Name of the sorting field
       * @param {boolean} descending If true, descending
       */
      this.sortElements = function (sort/* fieldName, descending */) {
        self.ngModel.sort((a, b) => {
          let comp1;
          let comp2;

          const mapping = {
            once: 0,
            '5m': 1,
            '1h': 2,
            '6h': 3,
          };

          switch (sort.fieldName) {
            case 'contact':
              comp1 = a.phone || a.email;
              comp2 = b.phone || b.email;
              break;
            case 'frequency':
              comp1 = mapping[a.frequency];
              comp2 = mapping[b.frequency];
              break;
            default:
              comp1 = a[sort.fieldName];
              comp2 = b[sort.fieldName];
          }
          if (comp1 < comp2) {
            return sort.descending ? 1 : -1;
          }
          if (comp1 > comp2) {
            return sort.descending ? -1 : 1;
          }
          return 0;
        });
      };

      /**
       * Process error from API
       * @param err
       */
      this.processError = function (err) {
        self.errorHandler({ ERR: err });
      };

      /**
       * Remove an element from the list (not removed in the API)
       * @param {Object} element Notification element
       */
      this.removeElement = function (element) {
        const eltIndex = self.ngModel.indexOf(element);
        if (eltIndex >= 0) {
          self.ngModel.splice(eltIndex, 1);
        }
      };

      /**
       * Remove an Element in the API
       * @param {Object} element Notification element
       */
      this.destroyElement = function (element) {
        _.set(element, 'frozen', true);
        OvhApiXdslNotifications.v6().remove({
          xdslId: element.xdslService,
          id: element.id,
        }).$promise.then(
          () => {
            self.removeElement(element);
          },
          err => self.processError(err),
        ).finally(() => {
          _.set(element, 'frozen', false);
        });
      };

      /**
       * Add an element in the API
       * @param {Object} element Notification element
       */
      this.submitElement = function (element) {
        _.set(element, 'frozen', true);
        _.set(element, 'editMode', false);
        OvhApiXdslNotifications.v6().add({
          xdslId: element.xdslService,
        }, element.getCreationData()).$promise.then(
          (data) => {
            _.set(element, 'id', data.id);
            _.set(element, 'editMode', false);
          },
          (err) => {
            _.set(element, 'editMode', true);
            return self.processError(err);
          },
        ).finally(() => {
          _.set(element, 'frozen', false);
        });
      };

      /**
       * Read the notifications from the API
       */
      this.getNotifications = function () {
        self.loading = true;
        OvhApiXdslNotifications.Aapi().list({
          xdslId: self.xdslService,
        }).$promise.then(
          (data) => {
            if (_.isArray(data)) {
              data.forEach((notif) => {
                self.ngModel.push(new NotificationElement(notif));
              });
            }
          },
          err => self.processError(err),
        ).finally(() => {
          self.loading = false;
        });
      };

      this.isTypeValid = function (value) {
        return value !== 'sms' || self.accounts.length !== 0;
      };

      const init = function () {
        if (typeof self.ngModel === 'undefined') {
          self.ngModel = [];
        }

        // notification type choices
        self.types = [
          { icon: 'fa-envelope-o', name: 'mail', label: 'components_notification_mail' },
          { icon: 'fa-mobile', name: 'sms', label: 'components_notification_sms' },
        ];

        // Frequency choices
        self.frequencies = [
          { name: 'once', label: 'components_notification_once' },
          { name: '5m', label: 'components_notification_5m' },
          { name: '1h', label: 'components_notification_1h' },
          { name: '6h', label: 'components_notification_6h' },
        ];

        // get the SMS accounts
        OvhApiSms.Aapi().query({}).$promise.then(
          (data) => {
            self.accounts = data;
          },
          err => self.processError(err),
        );

        // Get the Notifications
        $scope.$watch('NotificationListCtrl.xdslService', () => {
          self.getNotifications();
        }, true);

        $scope.$watch('NotificationListCtrl.ngModel', (newValue) => {
          self.onChange({ ELEMENTS: newValue });
        }, true);
      };

      init();
    },
  });
