#!/bin/sh

if [ -z "${CMAKE_BIN+x}" ]; then
	CMAKE_BIN=cmake
fi

# Assume mpicc has been installed
CXX=mpicxx CC=mpicc ${CMAKE_BIN} -H. -Bbuild -DLUA_USE_READLINE=Off -DLUA_USE_CURSES=Off -DBUILD_SHARED_LIBS=Off -DHIVE_BUILD_WITH_OPENMP=On -DHIVE_BUILD_WITH_MPI=On -DHIVE_BUILD_WITH_HDMLIB=On -DHIVE_BUILD_WITH_PDMLIB=On -DHIVE_BUILD_WITH_UDMLIB=On -DHIVE_BUILD_WITH_CDMLIB=On -DCMAKE_BUILD_WITH_COMPOSITOR=On -DCMAKE_BUILD_TYPE=Release