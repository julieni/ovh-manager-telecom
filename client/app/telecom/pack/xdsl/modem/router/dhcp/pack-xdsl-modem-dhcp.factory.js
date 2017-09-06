angular.module("managerApp").factory("PackXdslModemDhcpObject", function (OvhApiXdsl, $translate, Toast, $q) {
    "use strict";

    var template = {
        serverEnabled: true,
        defaultGateway: "",
        primaryDNS: "",
        secondaryDNS: "",
        domainName: "",
        startAddress: "",
        endAddress: "",
        leaseTime: null,
        lanName: "",
        dhcpName: ""
    };

    /**
     * Object constructor
     * @param {Object} data Data from APIv6
     */
    var PackXdslModemDhcpObject = function (data) {
        _.extend(
            this,
            template,
            _.pick(
                data,
                Object.keys(template)
            )
        );
    };

    PackXdslModemDhcpObject.prototype.save = function (serviceName) {
        var self = this;
        this.busy = true;
        return OvhApiXdsl.Modem().Lan().Dhcp().Lexi().update(
            {
                xdslId: serviceName,
                lanName: this.lanName,
                dhcpName: this.dhcpName
            },
            _.pick(this.tempValue, _.without(Object.keys(template), "lanName", "dhcpName"))
        ).$promise.then(
            function (data) {
                _.extend(self, self.tempValue);
                self.toggleEdit(false);
                Toast.success($translate.instant("xdsl_modem_dhcp_success", { name: self.domainName }));
                return data;
            }
        ).catch(function (err) {
            Toast.error($translate.instant("xdsl_modem_dhcp_submit_error"));
            return $q.reject(err);
        }).finally(function () {
            self.busy = false;
        });
    };

    /**
     * Cancel edit mode
     */
    PackXdslModemDhcpObject.prototype.cancel = function () {
        this.toggleEdit(false);
        return this.id;
    };

    /**
     * Enter Edit Mode
     */
    PackXdslModemDhcpObject.prototype.edit = function () {
        this.tempValue = _.pick(this, Object.keys(template));
        this.toggleEdit(true);
    };

    /**
     * Toggle edit mode
     * @param {Boolean} state [Optional] if set, for the edit mode state
     * @return {Boolean} new edit mode state
     */
    PackXdslModemDhcpObject.prototype.toggleEdit = function (state) {
        if (_.isBoolean(state)) {
            this.editMode = state;
        } else {
            this.editMode = !this.editMode;
        }
        return this.editMode;
    };

    return PackXdslModemDhcpObject;

});
