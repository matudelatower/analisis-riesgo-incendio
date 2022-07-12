import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, retry, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpService {


  constructor(private httpClient: HttpClient) { }

  get(url: string): Observable<any> {

    // let endpoint = resource;
    // if (id) {
    //   endpoint = resource + '/' + id;
    // }

    let params = new HttpParams();

    return this.httpClient.get(url)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );

  }

  handleError(error: any) {
    let errorMessage = '';
    // debugger
    if (error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      return throwError(error);
    }

    console.error(errorMessage);
    console.log('errorstatus', error.status)

    return throwError(errorMessage);
  }
}
