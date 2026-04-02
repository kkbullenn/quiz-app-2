FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["quiz-app-2.csproj", "."]
RUN dotnet restore "./quiz-app-2.csproj"
COPY . .
RUN dotnet publish "./quiz-app-2.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=build /src/static ./static
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "quiz-app-2.dll"]