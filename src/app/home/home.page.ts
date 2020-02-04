import { WebView } from '@ionic-native/ionic-webview/ngx';
import { File, FileEntry } from '@ionic-native/file/ngx';
import { Camera, PictureSourceType, CameraOptions } from '@ionic-native/camera/ngx';
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
  imagesDB:any = [];

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
    });
    this.downloadImageData();
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
            uploaded: false,
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
      header: "Selecione um",
      buttons: [{
        text: 'Carregar da galeria',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
        }
      },
      {

        text: 'Usar câmera',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.CAMERA);
        }
      },
      {
        text: 'Cancelar',
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
      saveToPhotoAlbum: true,
      correctOrientation: true,
    }

    this.camera.getPicture(options).then(imagePath =>{
      var curName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
      var correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
      this.copyFileToLocalDir(correctPath, curName, this.createFileName());
    });
  }

  copyFileToLocalDir(namePath, currentName, newFileName){
    this.file.copyFile(namePath, currentName, this.file.dataDirectory, newFileName).then(_ => {
      this.updateStoredImages(newFileName);
    }, error =>{
      this.presentToast('Erro ao carregar arquivo.');
    });
  }
  

  createFileName(){
    var d = new Date(),
        n = d.getTime(),
        a = d.getDate(),
        f = n + a,
        newFileName = f + ".jpg";
    return newFileName;
  }

  updateStoredImages(name){
    this.storage.get(STORAGE_KEY).then(images =>{
      let arr = JSON.parse(images);
      if(!arr) {
        let newImages = [name];
        this.storage.set(STORAGE_KEY, JSON.stringify(newImages));
      }else{
        arr.push(name);
        this.storage.set(STORAGE_KEY, JSON.stringify(arr));
      }

      let filePath = this.file.dataDirectory + name;
      let resPath = this.pathForImage(filePath);

      let newEntry = {
        name: name,
        path: resPath,
        filePath: filePath,
        uploaded: false,
      };

      this.images = [newEntry, ...this.images];
      this.ref.detectChanges();
    });
  }

  deleteImage(imgEntry, position){
    this.images.splice(position, 1);

    this.storage.get(STORAGE_KEY).then(images =>{
      let arr = JSON.parse(images);
      let filtered = arr.filter(name => name != imgEntry.name);
      this.storage.set(STORAGE_KEY, JSON.stringify(filtered));

      var correctPath = imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1);

      this.file.removeFile(correctPath, imgEntry.name).then(res =>{
        
      });
    });
  }

  startUpload(imgEntry){
    this.file.resolveLocalFilesystemUrl(imgEntry.filePath).then(entry =>{
      (<FileEntry>entry).file(file => this.readFile(file));
    }).catch(err => {
      this.presentToast('Erro ao ler arquivo.');
    });
    imgEntry.uploaded = true;
    
  }

  readFile(file: any){
    const reader = new FileReader();
    reader.onloadend = ()=>{
      const formData = new FormData();
      const imgBlob = new Blob([reader.result],{
          type: file.type
      });
      formData.append('file', imgBlob, file.name);
      this.uploadImageData(formData);
    };
    reader.readAsArrayBuffer(file);
  }

  async uploadImageData(formData: FormData){
    const loading = await this.loadingController.create({
      message: 'Enviando arquivo...',
    });
    await loading.present();

    this.http.post('https://appOrtoLook.plague677.com.br/upload.php', formData)
    .subscribe(res => {
      loading.dismiss();
      if (res['success']){
        this.presentToast('Arquivo enviado com sucesso.');
      }else{
        this.presentToast('Erro ao enviar arquivo.')
      }
    });
  }

  downloadImageData(){
    return new Promise (resolve =>{
      this.http.post('https://appOrtoLook.plague677.com.br/download.php', 'ping').subscribe(data=>{
      if(data['success']){
        for(let img of data['result']){
          this.imagesDB.push(img);
        }
        resolve(true);
      }
    });
    })
  }

  doRefresh(event) {
    this.imagesDB = [];

    setTimeout(() => {
      this.downloadImageData();
      event.target.complete();
    }, 500);
  }
}
