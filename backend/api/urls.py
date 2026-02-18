from django.urls import path
from . import views

urlpatterns = [
    path('health',                              views.HealthView.as_view()),
    path('auth/login',                          views.LoginView.as_view()),
    path('auth/logout',                         views.LogoutView.as_view()),
    path('auth/me',                             views.MeView.as_view()),
    path('hotels/me',                           views.HotelMeView.as_view()),
    path('rooms',                               views.RoomListCreateView.as_view()),
    path('rooms/<str:pk>',                      views.RoomDetailView.as_view()),
    path('stays',                               views.StayListCreateView.as_view()),
    path('stays/<str:pk>',                      views.StayDetailView.as_view()),
    path('payments',                            views.PaymentListCreateView.as_view()),
    path('payments/<str:pk>',                   views.PaymentDetailView.as_view()),
    path('expenses',                            views.ExpenseListCreateView.as_view()),
    path('expenses/<str:pk>',                   views.ExpenseDetailView.as_view()),
    path('month-closings',                      views.MonthClosingListView.as_view()),
    path('month-closings/close-previous',       views.ClosePreviousMonthView.as_view()),
    path('month-closings/<str:month>',          views.ReopenMonthView.as_view()),
    path('reports',                             views.ReportsView.as_view()),
    path('users',                               views.UserListCreateView.as_view()),
    path('users/<str:pk>/role',                 views.UserRoleView.as_view()),
    path('users/<str:pk>',                      views.UserDeleteView.as_view()),
    path('custom-payment-methods',              views.CustomPaymentMethodListCreateView.as_view()),
    path('custom-payment-methods/<str:pk>',     views.CustomPaymentMethodDeleteView.as_view()),
]
