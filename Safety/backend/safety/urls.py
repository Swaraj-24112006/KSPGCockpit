from django.urls import path
from safety import views

urlpatterns = [
    # Health check
    path('health', views.health_check, name='health_check'),

    # Media / Image upload (MinIO)
    path('safety/upload', views.upload_media, name='safety_upload'),

    # Overview: Safety Incidents
    path('safetyincidents', views.safety_incidents_list_create, name='safety_incidents_list_create'),
    path('safetyincidents/<str:incident_id>', views.safety_incident_detail, name='safety_incident_detail'),

    # Submodule 1: Safety Observations
    path('safety/observations', views.observations_list_create, name='observations_list_create'),
    path('safety/observations/<str:obs_id>', views.observation_detail, name='observation_detail'),

    # Submodule 2: Near Miss Reports
    path('safety/nearmiss', views.nearmiss_list_create, name='nearmiss_list_create'),
    path('safety/nearmiss/<str:nm_id>', views.nearmiss_detail, name='nearmiss_detail'),

    # Submodule 3: Accident Reports (Doctor & 5-Why)
    path('safety/accidents', views.accidents_list_create, name='accidents_list_create'),
    path('safety/accidents/<str:acc_id>', views.accident_detail, name='accident_detail'),
]

