import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, ModalController } from 'ionic-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';

import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import { TranslateService } from '@ngx-translate/core';

import { UserSettings, Wallet, WalletKeys } from '@models/model';
import { SettingsDataProvider } from '@providers/settings-data/settings-data';
import { UserDataProvider } from '@providers/user-data/user-data';
import { PinCodeComponent } from '@components/pin-code/pin-code';

import lodash from 'lodash';
import * as constants from '@app/app.constants';

let packageJson = require('@root/package.json');

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
  providers: [InAppBrowser],
})
export class SettingsPage {
  @ViewChild('pinCode') pinCode: PinCodeComponent;

  public objectKeys = Object.keys;

  public availableOptions;
  public currentSettings;
  public onEnterPinCode;
  public appVersion: number = packageJson.version;

  private unsubscriber$: Subject<void> = new Subject<void>();
  private currentWallet: Wallet;

  constructor(
    private navCtrl: NavController,
    private settingsDataProvider: SettingsDataProvider,
    private alertCtrl: AlertController,
    private translateService: TranslateService,
    private modalCtrl: ModalController,
    private userDataProvider: UserDataProvider,
    private inAppBrowser: InAppBrowser,
  ) {
    this.availableOptions = this.settingsDataProvider.AVALIABLE_OPTIONS;
    this.currentWallet = this.userDataProvider.currentWallet;
  }

  openChangePinPage() {
    let modal = this.modalCtrl.create('PinCodeModal', {
      message: 'PIN_CODE.DEFAULT_MESSAGE',
      outputPassword: true,
      validatePassword: true,
    });
    let that = this;

    modal.present();
    modal.onDidDismiss((password) => {
      if (password) {
        this.pinCode.createUpdatePinCode(null, password);
      }
    });
  }

  openWalletBackupPage() {
    if (!this.currentWallet || this.currentWallet.isWatchOnly) return this.presentSelectWallet();

    this.onEnterPinCode = this.showBackup;
    this.pinCode.open('PIN_CODE.DEFAULT_MESSAGE', true);
  }

  openPrivacyPolicy() {
    return this.inAppBrowser.create(constants.PRIVACY_POLICY_URL);
  }

  confirmClearData() {
    this.translateService.get([
      'CANCEL',
      'CONFIRM',
      'ARE_YOU_SURE',
      'SETTINGS_PAGE.CLEAR_DATA_TEXT',
    ]).takeUntil(this.unsubscriber$).subscribe((translation) => {
      let confirm = this.alertCtrl.create({
        title: translation.ARE_YOU_SURE,
        message: translation['SETTINGS_PAGE.CLEAR_DATA_TEXT'],
        buttons: [
          {
            text: translation.CANCEL
          },
          {
            text: translation.CONFIRM,
            handler: () => {
              this.onEnterPinCode = this.clearData;
              this.pinCode.open('PIN_CODE.DEFAULT_MESSAGE', false);
            }
          }
        ]
      });

      confirm.present();
    });
  }

  private presentSelectWallet() {
    this.translateService.get([
      'SETTINGS_PAGE.SELECT_WALLET_FIRST_TEXT',
      'SETTINGS_PAGE.NOT_AVAILABLE_WATCH_ONLY',
    ]).subscribe((translation) => {
      let message = this.currentWallet && this.currentWallet.isWatchOnly ? translation['SETTINGS_PAGE.NOT_AVAILABLE_WATCH_ONLY'] : translation['SETTINGS_PAGE.SELECT_WALLET_FIRST_TEXT'];

      let alert = this.alertCtrl.create({
        message,
        buttons: [{
          text: 'Ok'
        }]
      })

      alert.present();
    });
  }

  private clearData(event) {
    this.settingsDataProvider.clearData();
    this.navCtrl.setRoot('IntroPage');
  }

  private showBackup(keys: WalletKeys) {
    if (!keys) return;

    let modal = this.modalCtrl.create('WalletBackupModal', {
      title: 'SETTINGS_PAGE.WALLET_BACKUP',
      keys,
    });

    modal.present();
  }

  onUpdate() {
    this.settingsDataProvider.save(this.currentSettings);
  }

  ionViewDidLoad() {
    this.settingsDataProvider.settings
      .takeUntil(this.unsubscriber$)
      .do((settings) => this.currentSettings = settings)
      .subscribe();
  }

  ngOnInit() {
    this.settingsDataProvider.onUpdate$
      .takeUntil(this.unsubscriber$)
      .do((settings) => this.currentSettings = settings)
      .subscribe();
  }

  ngOnDestroy() {
    this.unsubscriber$.next();
    this.unsubscriber$.complete();
  }

}
