import { WebView } from '@ionic-native/ionic-webview/ngx';
import { File } from '@ionic-native/file/ngx';
import { Camera, PictureSourceType } from '@ionic-native/camera/ngx';
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActionSheetController, Platform, ToastController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { HttpClient } from '@angular/common/http';

const STORAGE_KEY = 'my_images';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  images = [];

  constructor(
    private camera: Camera,
    private file: File,
    private http: HttpClient,
    private webView: WebView,
    private actionSheetController: ActionSheetController,
    private toast: ToastController,
    private storage: Storage,
    private plt: Platform,
    private loadingController: LoadingController,
    private ref: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.plt.ready().then(() => {
      this.loadStoraedImages();
    })
  }

  loadStoraedImages() {
    this.storage.get(STORAGE_KEY).then(images =>{
      if (images){
        let arr = JSON.parse(images);
        this.images = [];
        for (let img of arr){
          let filePath = this.file.dataDirectory + img;
          let resPath = this.pathForImage(filePath);
          this.images.push({
            name: img,
            path: resPath,
            filePath: filePath,
          });
        }
      }
    });
  }

  pathForImage(img) {
    if (img === null) {
      return '';
    } else {
      let converted = this.webView.convertFileSrc(img);
      return converted;
    }
  }

  async presentToast(text) {
    const toast = await this.toast.create({
      message: text,
      position: 'bottom',
      duration: 3000,
    });
    toast.present();
  }

  async selectImage(){
    const actionSheet = await this.actionSheetController.create({
      header: "Select  Image source",
      buttons: [{
        text: 'Load from Library',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
        }
      },
      {
        text: 'Use camera',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.CAMERA);
        }
      },
      {
        text: 'Cancel',
        role: 'cancel'
      }
    ]
    });
    await actionSheet.present();
  }

  takePicture(sourceType: PictureSourceType){
    var options : CameraOptions = {
      quality: 100,
      sourceType: sourceType,
      saveToPhotoAlbum: false,
      correctOrientation: true,
    }

    this.camera.getPicture(options).then(imagePath =>{
      var curName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
      var correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
      // this.copyFileToLocalDir(correctPath, curName, this.createFileName());
    });
  }

}
