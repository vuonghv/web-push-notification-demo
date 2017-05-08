## Writing views
Một view function, hay đơn giản view là một hàm Python nhận đầu vào là một
Web request và trả ra một Web response. Response này có thể là mã HTML,
chuyển hướng, hoặc lỗi 404, tài liệu XML, ảnh ... View này chứa tất cả các xử lý
logic cần thiết để cho ra response.

## A simple view
View dưới đây trả về ngày tháng cộng thời gian hiện tại với mã HTML:

```Python
from django.http import HttpResponse
import datetime

def current_datetime(request):
    now = datetime.datetime.now()
    html = "<html><body>It is now %s.</body><html>" % now
    return HttpResponse(html)
```

Hãy cùng xem qua lần lượt từng dòng code trên:
 * Đầu tiên, chúng ta import class `HttpResponse` từ module `django.http`,
   cùng với thư viện `datetime`.
 * Kế  tiếp ta định nghĩa hàm `current_datetime`. Đây là `view` function. Mỗi view
   function nhận đầu vào là một đối tượng `HttpRequest` như là đối số  đầu tiên
   của nó, ta đặt tên nó là `request`.

   Lưu ý rằng ta có thể đặt tên view tùy ý, miễn là không vi phạm quy tắc tên định danh
   trong Python. Ở ví dụ trên ta đặt là `current_datetime` để  mô tả hàm trên làm gì.

 * View trả về một đối tượng `HttpResponse` chứa đựng nội dung nó trả về.

## Mapping URLs to views
View function trả về  HTML page chứa đựng ngày và thời gian hiện tại. Để  liên kết
view này với một URL cụ thể, bạn cần tạo định nghĩa `URLconf`.

## Returning errors
Trả ra mã lỗi HTTP trong Django cực kỳ dễ dàng. Có một số  lớp con của `HttpResponse`
cho một số mã HTTP phổ biến ngoài 200 (OK). Đơn giản ta chỉ cần trả về một đối
tượng của các lớp con này thay vì `HttpResponse` thông thường để thông báo có lỗi xảy ra. Ví dụ:

```Python
from django.http import HttpResponse, HttpResponseNotFound

def my_view(request):
    # Do something foo
    # ...
    if foo:
        return HttpResponseNotFound('<h1>Page not found</h1>')
    else:
        return HttpResponse('<h1>Page was found</h1>')
```

Không phải cứ mỗi HTTP code có một lớp con của `HttpResponse` tương ứng, bởi vì nhiều
mã không thật sự phổ biến cho lắm. Tuy nhiên, bạn có thể truyền mã HTTP mà mình muốn lúc khởi tạo đối tượng `HttpResponse`, ví dụ:

```Python
from django.http import HttpResponse

def my_view(request):
    # Do something
    # ....
    # Return 201 (created) response code
    return HttpResponse(status=201)
```

Bởi vì 404 là lỗi phổ biến nhất nên Django cũng cấp cách dễ dàng hơn để xử lý lỗi này

## Http404 exception
Khi bạn trả ra một lỗi, như là `HttpResponseNotFound`, bạn định nghĩa một tài liệu HTML thông báo lỗi:

```Python
return HttpResponseNotFound('<h1>Page not found</h1>')
```

Để cho thuận tiện và nhất quán, Django cung cấp cho ta `Http404` exception. Nếu bạn raise `Http404` trong view, Django sẽ bắt nó và trả về trang thông báo lỗi chuẩn, với HTTP error code 404. Ví dụ:

```Python
from django.http import Http404
from django.shortcuts import render
from polls.models import Poll

def detail(request, poll_id):
    try:
        p = Poll.objects.get(pk=poll_id)
    except Poll.DoesNotExist:
        raise Http404("Poll does not exist")
    return render(request, 'polls/detail.html', {'poll': p})
```

Để tùy chỉnh HTML khi Django trả về  404, bạn có thể  tạo một HTML template, tên là `404.html` và đặt nó trong thư mục gốc của cây thư mục template trong ứng dụng Django của bạn. Template này sẽ được sử dụng khi `DEBUG` được thiết lập là `False`.

## Kết luận
Hy vọng những kiến thức trên sẽ giúp ích cho bạn khi làm việc với Django's views.
Happy coding :)
