class ManagerNavbarService {
  constructor(
    $q, $translate, $translatePartialLoader, $rootScope,
    LANGUAGES, MANAGER_URLS, REDIRECT_URLS, TARGET, URLS,
    atInternet, OvhApiMe, ssoAuthentication, TucPackMediator, tucTelecomVoip,
    tucVoipService, TucSmsMediator, OvhApiFreeFax, OvhApiOverTheBox, TelecomMediator,
    NavbarBuilder, NavbarNotificationService, asyncLoader,
  ) {
    this.$q = $q;
    this.$translate = $translate;
    this.$translatePartialLoader = $translatePartialLoader;
    this.LANGUAGES = LANGUAGES;
    this.MANAGER_URLS = MANAGER_URLS;
    this.REDIRECT_URLS = REDIRECT_URLS;
    this.TARGET = TARGET;
    this.URLS = URLS;
    this.atInternet = atInternet;
    this.ovhApiMe = OvhApiMe;
    this.ssoAuthentication = ssoAuthentication;
    this.packMediator = TucPackMediator;
    this.tucTelecomVoip = tucTelecomVoip;
    this.tucVoipService = tucVoipService;
    this.smsMediator = TucSmsMediator;
    this.ovhApiFreeFax = OvhApiFreeFax;
    this.ovhApiOverTheBox = OvhApiOverTheBox;
    this.telecomMediator = TelecomMediator;
    this.NavbarBuilder = NavbarBuilder;
    this.navbarNotificationService = NavbarNotificationService;
    this.asyncLoader = asyncLoader;

    this.$rootScope = $rootScope;
  }

  getPackGroup(pack) {
    const packGroup = [];
    const addGroup = (group, name, title) => {
      packGroup.push({
        name,
        title,
        subLinks: _.map(group, xdsl => ({
          title: xdsl.description || xdsl.accessName,
          state: 'telecom.pack.xdsl',
          stateParams: {
            packName: pack.packName,
            serviceName: xdsl.accessName,
            number: xdsl.line.number,
          },
        })),
      });
    };

    // Dashboard
    packGroup.push({
      title: this.$translate.instant('telecom_sidebar_informations'),
      state: 'telecom.pack',
      stateParams: {
        packName: pack.packName,
      },
    });

    // xDSL Groups
    ['sdsl', 'adsl', 'vdsl'].forEach((accessType) => {
      const xdslGroup = _.filter(pack.xdsl, { accessType });
      if (xdslGroup.length) {
        addGroup(
          xdslGroup,
          `${pack.packName}.${accessType}`,
          _.capitalize(accessType),
        );
      }
    });

    return packGroup;
  }

  getPackProducts(count) {
    if (count < 0) {
      return this.$q.when(undefined);
    }

    return this.packMediator
      .fetchPacks()
      .then(result => _.map(result, (item) => {
        const itemLink = {
          name: item.packName,
          title: item.description || item.offerDescription || item.packName,
        };

        if (item.xdsl.length) {
          // Get subLinks for submenu
          itemLink.subLinks = this.getPackGroup(item);
        } else {
          // Or create a link
          itemLink.state = 'telecom.pack';
          itemLink.stateParams = {
            packName: item.packName,
          };
        }

        return itemLink;
      }))
      .catch(() => this.$q.when(undefined));
  }

  getTelephonyGroup(telephony) {
    const telephonyGroup = [];
    const addGroup = (group, name, title, state) => {
      telephonyGroup.push({
        name,
        title,
        subLinks: _.map(group, service => ({
          title: service.getDisplayedName(),
          state,
          stateParams: {
            billingAccount: service.billingAccount,
            serviceName: service.serviceName,
          },
        })),
      });
    };

    // Dashboard
    telephonyGroup.push({
      title: this.$translate.instant('telecom_sidebar_dashboard'),
      state: 'telecom.telephony',
      stateParams: {
        billingAccount: telephony.billingAccount,
      },
    });

    // Alias
    const alias = telephony.getAlias();
    const sortedAlias = this.tucVoipService.constructor.sortServicesByDisplayedName(alias);
    if (sortedAlias.length) {
      addGroup(
        sortedAlias,
        `${telephony.billingAccount}.alias`,
        this.$translate.instant('telecom_sidebar_section_telephony_number'),
        'telecom.telephony.alias',
      );
    }

    // Lines
    const lines = telephony.getLines();
    const sortedLines = this.tucVoipService.constructor.sortServicesByDisplayedName(lines);
    if (sortedLines.length) {
      // Lines
      const sortedSipLines = _.filter(sortedLines, line => ['plugAndFax', 'fax', 'voicefax'].indexOf(line.featureType) === -1);
      if (sortedSipLines.length) {
        addGroup(
          sortedSipLines,
          `${telephony.billingAccount}.line`,
          this.$translate.instant('telecom_sidebar_section_telephony_line'),
          'telecom.telephony.line',
        );
      }

      // PlugAndFax
      const sortedPlugAndFaxLines = this.tucVoipService
        .constructor.filterPlugAndFaxServices(sortedLines);
      if (sortedPlugAndFaxLines.length) {
        addGroup(
          sortedPlugAndFaxLines,
          `${telephony.billingAccount}.plugAndFax`,
          this.$translate.instant('telecom_sidebar_section_telephony_plug_fax'),
          'telecom.telephony.line',
        );
      }

      // Fax
      const sortedFaxLines = this.tucVoipService.constructor.filterFaxServices(sortedLines);
      if (sortedFaxLines.length) {
        addGroup(
          sortedFaxLines,
          `${telephony.billingAccount}.fax`,
          this.$translate.instant('telecom_sidebar_section_telephony_fax'),
          'telecom.telephony.fax',
        );
      }
    }

    return telephonyGroup;
  }

  getTelephonyProducts(count) {
    if (count < 0) {
      return this.$q.when(undefined);
    }

    return this.tucTelecomVoip
      .fetchAll()
      .then(result => _.map(result, (item) => {
        const itemLink = {
          name: item.billingAccount,
          title: item.getDisplayedName(),
        };

        if (item.services.length) {
          // Get subLinks for submenu
          itemLink.subLinks = this.getTelephonyGroup(item);
        } else {
          // Or create a link
          itemLink.state = 'telecom.telephony';
          itemLink.stateParams = {
            billingAccount: item.billingAccount,
          };
        }

        return itemLink;
      }))
      .catch(() => this.$q.when(undefined));
  }

  getSmsProducts(count) {
    if (count < 0) {
      return this.$q.when(undefined);
    }

    return this.smsMediator
      .initAll()
      .then(result => _.map(result, item => ({
        name: item.name,
        title: item.description || item.name,
        state: 'telecom.sms.dashboard',
        stateParams: {
          serviceName: item.name,
        },
      })))
      .catch(() => this.$q.when(undefined));
  }

  getFaxProducts(count) {
    if (count < 0) {
      return this.$q.when(undefined);
    }

    return this.ovhApiFreeFax.v6()
      .query().$promise
      .then(faxList => _.sortBy(faxList, 'number'))
      .then(result => _.map(result, item => ({
        name: item,
        title: item,
        state: 'freefax',
        stateParams: {
          serviceName: item,
        },
      })))
      .catch(() => this.$q.when(undefined));
  }

  getOtbProducts(count) {
    if (count < 0) {
      return this.$q.when(undefined);
    }

    return this.ovhApiOverTheBox.v6()
      .query().$promise
      .then((serviceNames) => {
        const requests = _.map(serviceNames, serviceName => this.ovhApiOverTheBox.v6().get({
          serviceName,
        }).$promise);

        return this.$q.all(requests);
      })
      .then(result => _.map(result, item => ({
        name: item.serviceName,
        title: item.customerDescription || item.serviceName,
        state: 'overTheBox.details',
        stateParams: {
          serviceName: item.serviceName,
        },
      })))
      .catch(() => this.$q.when(undefined));
  }

  getProducts() {
    return this.telecomMediator
      .initServiceCount()
      .then((count) => {
        const sum = _.sum(count);

        // TODO: Remove this ASAP, it's a quickfix to allow user to use the manager >.>
        // We have to lazy-load this part

        if (sum >= 500) {
          this.$rootScope.shouldDisplayMenuButtonFallback = true;
          return this.$q.when({});
        }

        return this.$q.all({
          pack: this.getPackProducts(count.pack),
          telephony: this.getTelephonyProducts(count.telephony),
          sms: this.getSmsProducts(count.sms),
          freefax: this.getFaxProducts(count.freefax),
          overTheBox: this.getOtbProducts(count.overTheBox),
        });
      })
      .catch(() => this.$q.when(undefined));
  }

  getUniverseMenu(products) {
    return [{
      name: 'managerv4',
      title: this.$translate.instant('telecom_sidebar_section_v4'),
      url: this.REDIRECT_URLS.telephonyV4,
    }, {
      name: 'pack',
      title: this.$translate.instant('telecom_sidebar_section_pack'),
      subLinks: products.pack,
    }, {
      name: 'telephony',
      title: this.$translate.instant('telecom_sidebar_section_telephony'),
      subLinks: products.telephony,
    }, {
      name: 'sms',
      title: this.$translate.instant('telecom_sidebar_section_sms'),
      subLinks: products.sms,
    }, {
      name: 'freefax',
      title: this.$translate.instant('telecom_sidebar_section_fax'),
      subLinks: products.freefax,
    }, {
      name: 'overTheBox',
      title: this.$translate.instant('telecom_sidebar_section_otb'),
      subLinks: products.overTheBox,
    }, {
      name: 'managerv4',
      title: this.$translate.instant('telecom_sidebar_section_task'),
      state: 'telecom.task',
    }];
  }

  getAssistanceMenu({ ovhSubsidiary: subsidiary }) {
    const mustDisplayNewMenu = ['FR'].includes(subsidiary);
    const currentSubsidiaryURLs = this.URLS || {};

    const assistanceMenuItems = [
      {
        title: this.$translate.instant('common_menu_support_help_center'),
        url: currentSubsidiaryURLs.support,
        isExternal: true,
        click: () => this.atInternet.trackClick({
          name: 'assistance::all_guides',
          type: 'action',
        }),
        mustBeKept: mustDisplayNewMenu && _(currentSubsidiaryURLs).has('support'),
      },
      {
        title: this.$translate.instant('common_menu_support_all_guides'),
        url: _.get(currentSubsidiaryURLs, 'guides.home'),
        isExternal: true,
        click: () => this.atInternet.trackClick({
          name: 'assistance::all_guides',
          type: 'action',
        }),
        mustBeKept: !mustDisplayNewMenu && _(currentSubsidiaryURLs).has('guides.home'),
      },
      {
        title: this.$translate.instant('common_menu_support_list_ticket'),
        url: _.get(this.REDIRECT_URLS, 'listTicket'),
        click: () => this.atInternet.trackClick({
          name: 'assistance::assistance_requests_created',
          type: 'action',
        }),
        mustBeKept: !mustDisplayNewMenu && _.has(this.REDIRECT_URLS, 'listTicket'),
      },
      {
        title: this.$translate.instant('common_menu_support_ask_for_assistance'),
        url: _.get(this.REDIRECT_URLS, 'listTicket'),
        click: () => this.atInternet.trackClick({
          name: 'assistance::assistance_requests_created',
          type: 'action',
        }),
        mustBeKept: mustDisplayNewMenu && _.has(this.REDIRECT_URLS, 'listTicket'),
      },
      {
        title: this.$translate.instant('common_menu_support_telephony_contact'),
        url: currentSubsidiaryURLs.support_contact,
        isExternal: true,
        click: () => this.atInternet.trackClick({
          name: 'assistance::helpline',
          type: 'action',
        }),
        mustBeKept: _.has(currentSubsidiaryURLs, 'support_contact'),
      },
    ];

    const useExpandedText = ['FR'].includes(subsidiary);

    return (useExpandedText
      ? this.NavbarBuilder.buildMenuHeader(this.$translate.instant('common_menu_support_assistance_expanded'))
      : this.$translate.instant('common_menu_support_assistance')
    )
      .then(title => ({
        name: 'assistance',
        title,
        headerTitle: this.$translate.instant('common_menu_support_assistance'),
        iconClass: 'icon-assistance',
        onClick: () => this.atInternet.trackClick({
          name: 'assistance',
          type: 'action',
        }),
        subLinks: assistanceMenuItems.filter(menuItem => menuItem.mustBeKept),
      }));
  }

  getLanguageMenu() {
    const currentLanguage = _.find(this.LANGUAGES.available, val => val.key === localStorage['univers-selected-language']);

    return {
      name: 'languages',
      label: _(currentLanguage).get('name'),
      class: 'oui-navbar-menu_language',
      title: _(currentLanguage).get('key').split('_')[0].toUpperCase(),
      headerTitle: this.$translate.instant('common_menu_language'),
      subLinks: _.map(this.LANGUAGES.available, lang => ({
        title: lang.name,
        isActive: lang.key === currentLanguage.key,
        click() {
          localStorage['univers-selected-language'] = lang.key;
          window.location.reload();
        },
        lang: _.chain(lang.key).words().head().value(),
      })),
    };
  }

  trackUserMenuSection(name, chapter2) {
    this.atInternet.trackClick({
      name,
      type: 'action',
      chapter1: 'account',
      chapter2,
    });
  }

  getUserMenu(currentUser) {
    const useExpandedText = ['FR'].includes(currentUser.ovhSubsidiary);

    return (useExpandedText
      ? this.NavbarBuilder.buildMenuHeader(`
      ${this.$translate.instant('common_menu_support_userAccount_1', { username: currentUser.firstname })}
      <br>
      ${this.$translate.instant('common_menu_support_userAccount_2')}
    `)
      : currentUser.firstname)
      .then(title => ({
        name: 'user',
        title,
        iconClass: 'icon-user',
        nichandle: currentUser.nichandle,
        fullName: `${currentUser.firstname} ${currentUser.name}`,
        subLinks: [
        // My Account
          {
            name: 'user.account',
            title: this.$translate.instant('common_menu_account'),
            url: this.REDIRECT_URLS.userInfos,
            click: () => this.trackUserMenuSection('my_account', 'account'),
            subLinks: [{
              title: this.$translate.instant('common_menu_account_infos'),
              url: this.REDIRECT_URLS.userInfos,
            }, {
              title: this.$translate.instant('common_menu_account_security'),
              url: this.REDIRECT_URLS.userSecurity,
            }, (this.TARGET === 'EU' || this.TARGET === 'CA') && {
              title: this.$translate.instant('common_menu_account_emails'),
              url: this.REDIRECT_URLS.userEmails,
            }, (this.TARGET === 'EU') && {
              title: this.$translate.instant('common_menu_account_subscriptions'),
              url: this.REDIRECT_URLS.userSubscriptions,
            }, {
              title: this.$translate.instant('common_menu_account_ssh'),
              url: this.REDIRECT_URLS.userSSH,
            }, {
              title: this.$translate.instant('common_menu_account_advanced'),
              url: this.REDIRECT_URLS.userAdvanced,
            }],
          },

          // Billing
          !currentUser.isEnterprise && {
            name: 'user.billing',
            title: this.$translate.instant('common_menu_billing'),
            url: this.REDIRECT_URLS.billing,
            click: () => this.trackUserMenuSection('my_facturation', 'billing'),
            subLinks: [{
              title: this.$translate.instant('common_menu_billing_history'),
              url: this.REDIRECT_URLS.billing,
            }, {
              title: this.$translate.instant('common_menu_billing_payments'),
              url: this.REDIRECT_URLS.billingPayments,
            }],
          },

          // Services
          (this.TARGET === 'EU' || this.TARGET === 'CA') && (!currentUser.isEnterprise ? {
            name: 'user.services',
            title: this.$translate.instant('common_menu_renew'),
            url: this.REDIRECT_URLS.services,
            click: () => this.trackUserMenuSection('my_services', 'services'),
            subLinks: [{
              title: this.$translate.instant('common_menu_renew_management'),
              url: this.REDIRECT_URLS.services,
            }, {
              title: this.$translate.instant('common_menu_renew_agreements'),
              url: this.REDIRECT_URLS.servicesAgreements,
            }],
          } : {
            title: this.$translate.instant('common_menu_renew_agreements'),
            url: this.REDIRECT_URLS.servicesAgreements,
          }),

          // Payment
          !currentUser.isEnterprise && {
            name: 'user.payment',
            title: this.$translate.instant('common_menu_means'),
            url: this.REDIRECT_URLS.paymentMeans,
            click: () => this.trackUserMenuSection('my_payment_types', 'payment_types'),
            subLinks: [{
              title: this.$translate.instant('common_menu_means_mean'),
              url: this.REDIRECT_URLS.paymentMeans,
            }, (this.TARGET === 'EU' || this.TARGET === 'CA') && {
              title: this.$translate.instant('common_menu_means_ovhaccount'),
              url: this.REDIRECT_URLS.ovhAccount,
            }, (this.TARGET === 'EU' || this.TARGET === 'CA') && {
              title: this.$translate.instant('common_menu_means_vouchers'),
              url: this.REDIRECT_URLS.billingVouchers,
            }, {
              title: this.$translate.instant('common_menu_means_refunds'),
              url: this.REDIRECT_URLS.billingRefunds,
            }, (this.TARGET === 'EU') && {
              title: this.$translate.instant('common_menu_means_fidelity'),
              url: this.REDIRECT_URLS.billingFidelity,
            }, {
              title: this.$translate.instant('common_menu_means_credits'),
              url: this.REDIRECT_URLS.billingCredits,
            }],
          },

          // Orders
          (!currentUser.isEnterprise && this.TARGET === 'EU' && currentUser.ovhSubsidiary === 'FR') && {
            title: this.$translate.instant('common_menu_orders_all'),
            url: this.REDIRECT_URLS.orders,
            click: () => this.trackUserMenuSection('my_orders', 'orders'),
          },

          // Contacts
          (this.TARGET === 'EU') && {
            title: this.$translate.instant('common_menu_contacts'),
            url: this.REDIRECT_URLS.contacts,
            click: () => this.trackUserMenuSection('my_contacts', 'contacts'),
          },

          // Tickets
          {
            title: this.$translate.instant('common_menu_list_ticket'),
            url: this.REDIRECT_URLS.listTicket,
            click: () => this.trackUserMenuSection('my_otrs_tickets', 'otrs'),
          },

          // Logout
          {
            title: this.$translate.instant('global_logout'),
            class: 'logout',
            click: (callback) => {
              this.ssoAuthentication.logout();

              if (typeof callback === 'function') {
                callback();
              }
            },
          },
        ],
      }));
  }

  // Get managers links for main-links attribute
  getManagerLinks(products) {
    const currentUniverse = 'telecom';
    const managerUrls = this.MANAGER_URLS;
    const managerNames = [
      'portal', 'web', 'dedicated', 'cloud', 'telecom', 'gamma', 'partners',
    ];

    return _.map(managerNames, (managerName) => {
      const managerLink = {
        name: managerName,
        class: managerName,
        title: this.$translate.instant(`common_menu_${managerName}`),
        url: managerUrls[managerName],
        isPrimary: ['partners', 'labs'].indexOf(managerName) === -1,
      };

      if (products && managerName === currentUniverse) {
        managerLink.subLinks = this.getUniverseMenu(products);
      }

      return managerLink;
    });
  }

  // Get products and build responsive menu
  getResponsiveLinks() {
    return this.getProducts()
      .then(products => this.getManagerLinks(products))
      .catch(() => this.getManagerLinks());
  }

  // Get navbar navigation and user infos
  getNavbar() {
    const managerUrls = this.MANAGER_URLS;

    // Get base structure for the navbar
    const getBaseNavbar = (user, notificationsMenu) => {
      const baseNavbar = {
        // Set OVH Logo
        brand: {
          label: this.$translate.instant('common_menu_telecom'),
          url: managerUrls.telecom,
          iconAlt: 'OVH',
          iconClass: 'navbar-logo',
          iconSrc: 'assets/images/navbar/icon-logo-ovh.svg',
        },

        // Set Manager Links
        managerLinks: this.getManagerLinks(),
      };

      return (user ? this.$q.all([
        this.getLanguageMenu(),
        this.getAssistanceMenu(user),
        this.getUserMenu(user),
      ])
        : this.$q.when([]))
        .then((internalLinks) => {
          baseNavbar.internalLinks = internalLinks;
          baseNavbar.internalLinks.splice(1, 0, notificationsMenu);
          return baseNavbar;
        });
    };

    this.asyncLoader.addTranslations(
      import(`../../app/common/translations/Messages_${this.$translate.use()}.xml`)
        .catch(() => import(`../../app/common/translations/Messages_${this.$translate.fallbackLanguage()}.xml`))
        .then(x => x.default),
    );

    return this.$translate.refresh()
      .then(() => this.ovhApiMe.v6().get().$promise)
      .then(user => this.navbarNotificationService.getNavbarContent(user)
        .then(notifications => getBaseNavbar(user, notifications)))
      .catch(() => getBaseNavbar());
  }
}

angular.module('managerApp')
  .service('ManagerNavbarService', ManagerNavbarService);
