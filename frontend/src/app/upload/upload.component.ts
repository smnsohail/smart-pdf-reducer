import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  selectedFile!: File;
  sizeLimit = 200;
  downloadUrl: string = '';

  constructor(private http: HttpClient) {}

  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSubmit() {
    const formData = new FormData();
    formData.append('image', this.selectedFile);
    formData.append('sizeLimit', this.sizeLimit.toString());

    this.http.post<any>('http://localhost:3000/upload', formData).subscribe({
      next: (res) => this.downloadUrl = 'http://localhost:3000' + res.downloadUrl,
      error: () => alert('Conversion failed. Try again.')
    });
  }
}
