from django.urls import path
from .views import verify_kaizen, get_verification, close_kaizen, get_closure

urlpatterns = [
    path('kaizens/<int:kaizen_id>/verify/', verify_kaizen, name='kaizen-verify'),
    path('kaizens/<int:kaizen_id>/verification/', get_verification, name='kaizen-verification'),
    path('kaizens/<int:kaizen_id>/close/', close_kaizen, name='kaizen-close'),
    path('kaizens/<int:kaizen_id>/closure/', get_closure, name='kaizen-closure'),
]
